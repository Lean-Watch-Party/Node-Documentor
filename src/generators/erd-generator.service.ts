import { Injectable } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import { EntityRelationship } from '../common/types';

@Injectable()
export class ErdGeneratorService {
  async generateMermaidCodeOnly(
    relationships: EntityRelationship[],
    outputDir: string,
  ): Promise<string> {
    if (!relationships.length)
      return 'erDiagram\n    %% No relationships found';

    const relationshipMap = {
      OneToOne: '||--||',
      ManyToOne: 'o|--||',
      OneToMany: '||--|o',
      ManyToMany: 'o|--|o',
    };

    let mermaidSyntax = 'erDiagram\n';
    relationships.forEach((rel) => {
      const link = relationshipMap[rel.type];
      if (!link) return;
      mermaidSyntax += `    ${rel.from} ${link} ${rel.to} : ""\n`;
    });

    const mermaidFilePath = path.join(outputDir, 'erd.mmd');
    await fs.promises.mkdir(outputDir, { recursive: true });
    await fs.promises.writeFile(mermaidFilePath, mermaidSyntax);
    return mermaidSyntax;
  }
}
