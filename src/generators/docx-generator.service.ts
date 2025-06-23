import { Injectable } from '@nestjs/common';
import {
  Document,
  Paragraph,
  HeadingLevel,
  TableOfContents,
  Table,
  TableRow,
  TableCell,
  WidthType,
} from 'docx';
import {
  ParsedProjectData,
  ClassInfo,
  FunctionInfo,
  MethodInfo,
} from '../common/types';

@Injectable()
export class DocxGeneratorService {
  async generate(
    data: ParsedProjectData,
    folderTree: string,
    erdMermaidCode: string,
    apiDocs: any[],
  ): Promise<Document> {
    const erdDiagramBlock = erdMermaidCode
      ? [
          new Paragraph({
            text: 'Mermaid ER Diagram Syntax',
            heading: HeadingLevel.HEADING_2,
          }),
          ...erdMermaidCode
            .split('\n')
            .map((line) => new Paragraph({ text: line, style: 'Courier' })),
          new Paragraph({
            text: '(Paste into https://mermaid.live to visualize)',
            style: 'IntenseQuote',
          }),
        ]
      : [new Paragraph('No relationships found.')];

    return new Document({
      features: { updateFields: true },
      sections: [
        {
          children: [
            new Paragraph({
              text: 'Project Documentation',
              heading: HeadingLevel.TITLE,
            }),
            new TableOfContents('Table of Contents', {
              hyperlink: true,
              headingStyleRange: '1-3',
            }),
            new Paragraph({ pageBreakBefore: true }),

            new Paragraph({
              text: 'Folder Structure',
              heading: HeadingLevel.HEADING_1,
            }),
            new Paragraph({ text: folderTree, style: 'Courier' }),
            new Paragraph({ pageBreakBefore: true }),

            new Paragraph({
              text: 'Database Schema',
              heading: HeadingLevel.HEADING_1,
            }),
            ...erdDiagramBlock,
            ...this.formatDatabaseTables(data.entities),
            new Paragraph({ pageBreakBefore: true }),

            new Paragraph({
              text: 'Class & Function Details',
              heading: HeadingLevel.HEADING_1,
            }),
            ...this.formatClasses(data.classes),
            ...this.formatFunctions(data.functions),

            new Paragraph({ pageBreakBefore: true }),
            new Paragraph({
              text: 'API Endpoints',
              heading: HeadingLevel.HEADING_1,
            }),
            ...this.formatApiDocs(apiDocs),
          ],
        },
      ],
      styles: {
        paragraphStyles: [
          {
            id: 'Courier',
            name: 'Courier',
            basedOn: 'Normal',
            next: 'Normal',
            run: { font: { name: 'Courier New' } },
          },
          {
            id: 'IntenseQuote',
            name: 'Intense Quote',
            basedOn: 'Normal',
            next: 'Normal',
            run: { italics: true, color: '666666' },
          },
        ],
      },
    });
  }

  private formatDatabaseTables(entities: ClassInfo[]): (Paragraph | Table)[] {
    if (!entities || entities.length === 0) return [];

    const elements: (Paragraph | Table)[] = [];

    entities.forEach((entity) => {
      elements.push(
        new Paragraph({
          text: `Entity: ${entity.name}`,
          heading: HeadingLevel.HEADING_2,
        }),
      );

      const tableRows = [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph('Column')] }),
            new TableCell({ children: [new Paragraph('Type')] }),
            new TableCell({ children: [new Paragraph('Decorators')] }),
          ],
        }),
      ];

      entity.properties?.forEach((prop) => {
        tableRows.push(
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph(prop.name || '')] }),
              new TableCell({ children: [new Paragraph(prop.type || '')] }),
              new TableCell({
                children: [
                  new Paragraph((prop.decorators || []).join(', ') || ''),
                ],
              }),
            ],
          }),
        );
      });

      elements.push(
        new Table({
          rows: tableRows,
          width: { size: 100, type: WidthType.PERCENTAGE },
        }),
      );
    });

    return elements;
  }

  private formatClasses = (items: ClassInfo[]) =>
    this.formatItems(items, 'Class');

  private formatFunctions = (items: FunctionInfo[]) =>
    this.formatItems(items, 'Function');

  private formatItems(
    items: (ClassInfo | FunctionInfo)[],
    type: 'Class' | 'Function',
  ): Paragraph[] {
    const elements: Paragraph[] = [];

    if (!items || items.length === 0) return elements;

    items.forEach((item) => {
      elements.push(
        new Paragraph({
          text: `${type}: ${item.name}`,
          heading: HeadingLevel.HEADING_2,
        }),
      );

      item.docs?.split('\n').forEach((line: string) => {
        if (line.startsWith('```json') || line.startsWith('```')) return;

        const style =
          line.startsWith('{') || line.startsWith('  ') || line.startsWith('}')
            ? 'Courier'
            : undefined;

        elements.push(new Paragraph({ text: line, style }));
      });

      if ('methods' in item && Array.isArray(item.methods)) {
        item.methods.forEach((method: MethodInfo) => {
          elements.push(
            new Paragraph({
              text: `Method: ${method.name}`,
              heading: HeadingLevel.HEADING_3,
            }),
          );

          method.docs?.split('\n').forEach((line: string) => {
            if (line.startsWith('```json') || line.startsWith('```')) return;

            const style =
              line.startsWith('{') ||
              line.startsWith('  ') ||
              line.startsWith('}')
                ? 'Courier'
                : undefined;

            elements.push(new Paragraph({ text: line, style }));
          });
        });
      }
    });

    return elements;
  }

  private formatApiDocs(apiDocs: any[]): Paragraph[] {
    const paragraphs: Paragraph[] = [];

    apiDocs.forEach((doc) => {
      paragraphs.push(
        new Paragraph({
          text: `Endpoint: ${doc.route}`,
          heading: HeadingLevel.HEADING_2,
        }),
        new Paragraph({
          text: `Controller: ${doc.controller} → Method: ${doc.methodName}`,
          style: 'IntenseQuote',
        }),
      );

      if (doc.requestDto) {
        paragraphs.push(new Paragraph({ text: 'Payload:' }));
        Object.entries(doc.requestDto.fields || {}).forEach(([key, val]) => {
          paragraphs.push(
            new Paragraph({ text: `- ${key}: ${val}`, style: 'Courier' }),
          );
        });
      }

      if (doc.responseDto) {
        paragraphs.push(new Paragraph({ text: 'Response:' }));
        Object.entries(doc.responseDto.fields || {}).forEach(([key, val]) => {
          paragraphs.push(
            new Paragraph({ text: `- ${key}: ${val}`, style: 'Courier' }),
          );
        });
      }

      paragraphs.push(new Paragraph('')); // spacing
    });

    return paragraphs;
  }
}
