// src/documentation/dto/create-documentation.dto.ts
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateDocumentationDto {
  @IsString()
  @IsNotEmpty()
  projectPath: string;
}
