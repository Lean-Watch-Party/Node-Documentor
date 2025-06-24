import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execFile } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { Packer } from 'docx';
import tree from 'tree-node-cli';
import { ErdGeneratorService } from '../generators/erd-generator.service';
import { DocxGeneratorService } from '../generators/docx-generator.service';
import {
  ParsedProjectData,
  EntityRelationship,
  ClassInfo,
  FunctionInfo,
} from '../common/types';
import { generateApiDoc } from 'src/scripts/api-parser.util';

@Injectable()
export class DocumentationService {
  private readonly goParserExecutablePath: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly erdGenerator: ErdGeneratorService,
    private readonly docxGenerator: DocxGeneratorService,
  ) {
    const relativePath = this.configService.get<string>(
      'GO_PARSER_PATH',
      './parser-go/go-parser',
    );
    this.goParserExecutablePath = path.resolve(process.cwd(), relativePath);
  }

  public async generateDocx(projectPath: string): Promise<Buffer> {
    if (!fs.existsSync(projectPath)) {
      throw new NotFoundException(`Project path not found: ${projectPath}`);
    }

    const parsedData = await this.runGoParser(projectPath);
    const apiDocs = generateApiDoc(projectPath);
    for (const doc of apiDocs) {
      console.log(doc);
    }
    const folderTree = tree(projectPath, {
      exclude: [/node_modules/, /dist/, /\.git/, /output/],
    });

    const projectName = path.basename(projectPath);
    const outputDir = path.resolve(process.cwd(), 'output', projectName);
    await fs.promises.mkdir(outputDir, { recursive: true });

    // ✅ Generate raw mermaid code instead of PNG
    const erdMermaidCode = await this.erdGenerator.generateMermaidCodeOnly(
      parsedData.relationships ?? [],
      outputDir,
    );

    const doc = await this.docxGenerator.generate(
      parsedData,
      folderTree,
      erdMermaidCode, // ✅ Pass code as string
      apiDocs,
    );

    const buffer = await Packer.toBuffer(doc);
    const filePath = path.join(outputDir, `${projectName}-documentation.docx`);
    await fs.promises.writeFile(filePath, buffer);

    return buffer;
  }

  private runGoParser(projectPath: string): Promise<ParsedProjectData> {
    return new Promise((resolve, reject) => {
      let executablePath = this.goParserExecutablePath;
      if (process.platform === 'win32') {
        executablePath += '.exe';
      }

      console.log('--- [Go Parser Execution Start] ---');
      console.log(`[DEBUG] Resolved executable path: ${executablePath}`);
      console.log(`[DEBUG] Target project path: ${projectPath}`);

      if (!fs.existsSync(executablePath)) {
        const errorMsg = `Go parser executable not found: ${executablePath}`;
        console.error(`[FATAL] ${errorMsg}`);
        return reject(new InternalServerErrorException(errorMsg));
      }

      execFile(
        executablePath,
        [projectPath],
        { maxBuffer: 1024 * 1024 * 50 },
        (error, stdout, stderr) => {
          if (error) {
            const errorMessage =
              error instanceof Error ? error.message : 'Unknown error';
            console.error(`[FATAL] Go Parser Error:`, errorMessage);
            console.error(`[STDERR] ${stderr}`);
            return reject(
              new InternalServerErrorException('Go parser failed.'),
            );
          }

          try {
            const outputString = typeof stdout === 'string' ? stdout : '';
            if (!outputString) {
              throw new Error('Go parser returned empty output.');
            }

            const parsedJson: unknown = JSON.parse(outputString);
            if (
              typeof parsedJson === 'object' &&
              parsedJson !== null &&
              'entities' in parsedJson &&
              'classes' in parsedJson &&
              'functions' in parsedJson
            ) {
              const transformedData: ParsedProjectData = {
                entities: parsedJson['entities'] as ClassInfo[],
                classes: parsedJson['classes'] as ClassInfo[],
                functions: parsedJson['functions'] as FunctionInfo[],
                relationships:
                  (parsedJson['relationships'] as EntityRelationship[]) || [],
              };
              resolve(transformedData);
            } else {
              throw new Error('Go parser JSON structure is invalid.');
            }
          } catch (err) {
            const errorMessage =
              err instanceof Error ? err.message : 'Unknown parse error';
            console.error(`[FATAL] JSON parsing error:`, errorMessage);
            console.error(`[STDOUT] ${stdout}`);
            reject(
              new InternalServerErrorException(
                'Failed to parse Go parser output.',
              ),
            );
          }
        },
      );
    });
  }
}
