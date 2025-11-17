import Tesseract from "tesseract.js";
import { createCanvas, Canvas, CanvasRenderingContext2D } from "canvas";
import config from "../config/index.js";
import logger from "../utils/logger.js";

interface CanvasAndContext {
  canvas: Canvas;
  context: CanvasRenderingContext2D;
}

const loadPdfJs = async () => import("pdfjs-dist/legacy/build/pdf.mjs");

const SCALE = 2;

class NodeCanvasFactory {
  create(width: number, height: number): CanvasAndContext {
    const canvas = createCanvas(Math.ceil(width), Math.ceil(height));
    const context = canvas.getContext("2d");
    return { canvas, context };
  }

  reset(canvasAndContext: CanvasAndContext, width: number, height: number): void {
    if (!canvasAndContext.canvas) return;
    canvasAndContext.canvas.width = Math.ceil(width);
    canvasAndContext.canvas.height = Math.ceil(height);
  }

  destroy(canvasAndContext: CanvasAndContext): void {
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
  }
}

export interface OCRPageResult {
  pageNumber: number;
  text: string;
}

class OCRService {
  async extractTextFromImage(buffer: Buffer, pageNumber = 1): Promise<OCRPageResult> {
    const { data } = await Tesseract.recognize(buffer, config.ocrLanguages, {
      logger: (message) => logger.debug("tesseract", message),
    });

    return {
      pageNumber,
      text: data?.text?.trim() || "",
    };
  }

  async extractTextFromPdf(buffer: Buffer): Promise<OCRPageResult[]> {
    const pdfjs = await loadPdfJs();
    const document = await pdfjs.getDocument({ data: buffer }).promise;
    const factory = new NodeCanvasFactory();
    const pages: OCRPageResult[] = [];

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const viewport = page.getViewport({ scale: SCALE });
      const { canvas, context } = factory.create(viewport.width, viewport.height);
      const renderTask = page.render({
        canvasContext: context as unknown as CanvasRenderingContext2D,
        viewport,
        canvasFactory: factory as never,
      } as never);

      await renderTask.promise;
      const bufferImage = canvas.toBuffer("image/png");
      factory.destroy({ canvas, context });

      const ocrResult = await this.extractTextFromImage(bufferImage, pageNumber);
      pages.push(ocrResult);
    }

    return pages;
  }
}

export const ocrService = new OCRService();
