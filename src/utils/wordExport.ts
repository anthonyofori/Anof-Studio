import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  ShadingType,
} from 'docx';
import { UniversalTranslationResult } from '../types';

export interface WordExportOptions {
  mode?: 'full' | 'translated-only';
  customFilename?: string;
}

/**
 * Generates a professionally styled Microsoft Word (.docx) document
 * from a UniversalTranslationResult.
 */
export async function generateTranslationDocxBlob(
  result: UniversalTranslationResult,
  options: WordExportOptions = {}
): Promise<Blob> {
  const mode = options.mode || 'full';
  const currentDate = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const children: any[] = [];

  // 1. Document Title
  children.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.LEFT,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: result.title || `${result.sourceLang} → ${result.targetLang} Translation`,
          bold: true,
          size: 36, // 18pt
          color: '0F172A',
          font: 'Arial',
        }),
      ],
    })
  );

  // 2. Subtitle / Metadata Banner
  children.push(
    new Paragraph({
      spacing: { after: 300 },
      children: [
        new TextRun({
          text: `Anof Studio Universal Translation  |  ${result.sourceLang} → ${result.targetLang}  |  ${currentDate}`,
          color: '64748B',
          size: 20, // 10pt
          italics: true,
          font: 'Arial',
        }),
      ],
    })
  );

  // 3. Translated Section Header
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 200, after: 120 },
      children: [
        new TextRun({
          text: `Translated Script (${result.targetLang})`,
          bold: true,
          size: 28, // 14pt
          color: 'D97706', // Amber-600
          font: 'Arial',
        }),
      ],
    })
  );

  // 4. Translated Text Paragraphs
  const translatedParagraphs = result.translatedText.split(/\n+/).filter(Boolean);
  if (translatedParagraphs.length === 0) {
    translatedParagraphs.push(result.translatedText);
  }

  translatedParagraphs.forEach((para) => {
    children.push(
      new Paragraph({
        spacing: { after: 180, line: 320 },
        children: [
          new TextRun({
            text: para.trim(),
            size: 23, // 11.5pt
            color: '1E293B',
            font: 'Arial',
          }),
        ],
      })
    );
  });

  // If Full Mode is requested, append Original Script, Sentence Alignment Table, and Glossary Table
  if (mode === 'full') {
    // 5. Vocal Guidance (if present)
    if (result.pronunciationNotes) {
      children.push(
        new Paragraph({
          spacing: { before: 200, after: 100 },
          children: [
            new TextRun({
              text: 'Vocal Pronunciation & Narration Guidance: ',
              bold: true,
              size: 20,
              color: '475569',
              font: 'Arial',
            }),
            new TextRun({
              text: result.pronunciationNotes,
              size: 20,
              italics: true,
              color: '475569',
              font: 'Arial',
            }),
          ],
        })
      );
    }

    // 6. Original Source Text Section
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 120 },
        children: [
          new TextRun({
            text: `Original Script (${result.sourceLang})`,
            bold: true,
            size: 26, // 13pt
            color: '475569',
            font: 'Arial',
          }),
        ],
      })
    );

    const originalParagraphs = result.originalText.split(/\n+/).filter(Boolean);
    originalParagraphs.forEach((para) => {
      children.push(
        new Paragraph({
          spacing: { after: 140, line: 300 },
          children: [
            new TextRun({
              text: para.trim(),
              size: 21, // 10.5pt
              color: '64748B',
              font: 'Arial',
            }),
          ],
        })
      );
    });

    // 7. Side-by-Side Sentence Alignment Table
    if (result.sentencePairs && result.sentencePairs.length > 0) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400, after: 160 },
          children: [
            new TextRun({
              text: 'Sentence-by-Sentence Alignment',
              bold: true,
              size: 26,
              color: '1E293B',
              font: 'Arial',
            }),
          ],
        })
      );

      const tableRows: TableRow[] = [
        // Header Row
        new TableRow({
          tableHeader: true,
          children: [
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.CLEAR, fill: 'F1F5F9' },
              children: [
                new Paragraph({
                  spacing: { before: 80, after: 80 },
                  children: [
                    new TextRun({
                      text: `Source (${result.sourceLang})`,
                      bold: true,
                      size: 20,
                      color: '0F172A',
                      font: 'Arial',
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.CLEAR, fill: 'FEF3C7' }, // Amber light tint
              children: [
                new Paragraph({
                  spacing: { before: 80, after: 80 },
                  children: [
                    new TextRun({
                      text: `Target (${result.targetLang})`,
                      bold: true,
                      size: 20,
                      color: '92400E',
                      font: 'Arial',
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ];

      // Content Rows
      result.sentencePairs.forEach((pair, idx) => {
        const isAlt = idx % 2 === 1;
        tableRows.push(
          new TableRow({
            children: [
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                shading: isAlt ? { type: ShadingType.CLEAR, fill: 'F8FAFC' } : undefined,
                children: [
                  new Paragraph({
                    spacing: { before: 60, after: 60 },
                    children: [
                      new TextRun({
                        text: pair.source,
                        size: 19,
                        color: '334155',
                        font: 'Arial',
                      }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                shading: isAlt ? { type: ShadingType.CLEAR, fill: 'FFFBEB' } : undefined,
                children: [
                  new Paragraph({
                    spacing: { before: 60, after: 60 },
                    children: [
                      new TextRun({
                        text: pair.target,
                        bold: true,
                        size: 19,
                        color: '78350F',
                        font: 'Arial',
                      }),
                    ],
                  }),
                ],
              }),
            ],
          })
        );
      });

      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: tableRows,
        })
      );
    }

    // 8. Key Terminology / Glossary Table
    if (result.vocabulary && result.vocabulary.length > 0) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400, after: 160 },
          children: [
            new TextRun({
              text: 'Key Terminology & Medical/Commercial Glossary',
              bold: true,
              size: 26,
              color: '1E293B',
              font: 'Arial',
            }),
          ],
        })
      );

      const vocabRows: TableRow[] = [
        new TableRow({
          tableHeader: true,
          children: [
            new TableCell({
              width: { size: 30, type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.CLEAR, fill: 'F1F5F9' },
              children: [
                new Paragraph({
                  spacing: { before: 80, after: 80 },
                  children: [
                    new TextRun({
                      text: 'Source Term',
                      bold: true,
                      size: 20,
                      color: '0F172A',
                      font: 'Arial',
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 30, type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.CLEAR, fill: 'FEF3C7' },
              children: [
                new Paragraph({
                  spacing: { before: 80, after: 80 },
                  children: [
                    new TextRun({
                      text: `Target (${result.targetLang})`,
                      bold: true,
                      size: 20,
                      color: '92400E',
                      font: 'Arial',
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 40, type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.CLEAR, fill: 'F8FAFC' },
              children: [
                new Paragraph({
                  spacing: { before: 80, after: 80 },
                  children: [
                    new TextRun({
                      text: 'Definition & Context',
                      bold: true,
                      size: 20,
                      color: '0F172A',
                      font: 'Arial',
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ];

      result.vocabulary.forEach((item, idx) => {
        vocabRows.push(
          new TableRow({
            children: [
              new TableCell({
                width: { size: 30, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    spacing: { before: 60, after: 60 },
                    children: [
                      new TextRun({
                        text: item.sourceTerm,
                        size: 19,
                        color: '334155',
                        font: 'Arial',
                      }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 30, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    spacing: { before: 60, after: 60 },
                    children: [
                      new TextRun({
                        text: item.targetTerm,
                        bold: true,
                        size: 19,
                        color: '92400E',
                        font: 'Arial',
                      }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 40, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    spacing: { before: 60, after: 60 },
                    children: [
                      new TextRun({
                        text: item.explanation,
                        size: 18,
                        color: '475569',
                        font: 'Arial',
                      }),
                    ],
                  }),
                ],
              }),
            ],
          })
        );
      });

      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: vocabRows,
        })
      );
    }
  }

  // 9. Confidentiality / Footer Note
  children.push(
    new Paragraph({
      spacing: { before: 400 },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: '— Generated by Anof Studio Multimodal AI Suite —',
          size: 18,
          color: '94A3B8',
          italics: true,
          font: 'Arial',
        }),
      ],
    })
  );

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  return await Packer.toBlob(doc);
}

/**
 * Triggers browser download for a generated Word (.docx) document
 */
export function downloadWordDocument(blob: Blob, filename: string): void {
  const cleanName = filename.endsWith('.docx') ? filename : `${filename}.docx`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = cleanName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
