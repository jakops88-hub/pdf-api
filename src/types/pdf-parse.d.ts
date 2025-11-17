declare module "pdf-parse" {
  export interface PDFParseOptions {
    version?: string;
    pagerender?: (pageData: unknown) => string;
    max?: number;
  }

  export interface PDFParseResult {
    numpages: number;
    numrender: number;
    info: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    text: string;
    version: string;
  }

  export default function pdfParse(
    dataBuffer: Buffer | Uint8Array,
    options?: PDFParseOptions
  ): Promise<PDFParseResult>;
}