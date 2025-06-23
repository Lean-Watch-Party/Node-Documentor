import { Controller, Post, Body, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { DocumentationService } from './documentation.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CreateDocumentationDto } from 'src/dtos/create-documentation.dto';

@ApiTags('Documentation')
@Controller('documentation')
export class DocumentationController {
  constructor(private readonly documentationService: DocumentationService) {}

  @Post('generate')
  @ApiOperation({ summary: 'Generate a .docx file for a project folder' })
  async generateDocumentation(
    @Body() createDocumentationDto: CreateDocumentationDto,
    @Res() res: Response,
  ) {
    try {
      const buffer = await this.documentationService.generateDocx(
        createDocumentationDto.projectPath,
      );

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=documentation.docx',
      );
      res.status(HttpStatus.OK).send(buffer);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred';
      res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: 'Failed to generate document', error: errorMessage });
    }
  }
}
