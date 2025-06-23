import { Module } from '@nestjs/common';
import { DocxGeneratorService } from '../generators/docx-generator.service';
import { ErdGeneratorService } from '../generators/erd-generator.service';
import { DocumentationController } from './documentation.controller';
import { DocumentationService } from './documentation.service';

@Module({
  controllers: [DocumentationController],
  providers: [DocumentationService, ErdGeneratorService, DocxGeneratorService],
})
export class DocumentationModule {}
