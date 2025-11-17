import pdfParse from "pdf-parse";
import { splitTextByPage } from "../utils/fileUtils.js";

export interface PdfExtraction {
  text: string;
  pages: string[];
  pageCount: number;
}

class PdfService {
  async extract(buffer: Buffer): Promise<PdfExtraction> {
    const parsed = await pdfParse(buffer);
    const pages = splitTextByPage(parsed.text);

    return {
      text: parsed.text.trim(),
      pages,
      pageCount: parsed.numpages,
    };
  }
}

export const pdfService = new PdfService();
