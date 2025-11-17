import {
  ExtractionInput,
  ExtractionResult,
  InvoiceFieldConfidence,
  InvoiceFields,
  PageContent,
  TableData,
} from "../types/extraction.js";
import { isLikelyScannedPdf, isPdfFile } from "../utils/fileUtils.js";
import logger from "../utils/logger.js";
import { ocrService } from "./ocrService.js";
import { pdfService } from "./pdfService.js";

const DATE_PATTERN = /\b(\d{4}[\/.\-]\d{1,2}[\/.\-]\d{1,2}|\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4})\b/;
const AMOUNT_PATTERN = /([+-]?\d{1,3}(?:[ .]\d{3})*(?:[.,]\d{2})|\d+[.,]\d{2})/;
const KNOWN_CURRENCIES = [
  "SEK",
  "USD",
  "EUR",
  "GBP",
  "NOK",
  "DKK",
  "CHF",
  "JPY",
  "kr",
  "dkk",
  "nok",
  "usd",
  "eur",
  "$",
  "€",
];

type FieldKey = keyof InvoiceFields;

interface FieldDetection {
  value: string | null;
  confidence: number;
}

export interface ExtractionDependencies {
  pdfService: typeof pdfService;
  ocrService: typeof ocrService;
}

export class ExtractionService {
  constructor(private readonly deps: ExtractionDependencies = { pdfService, ocrService }) {}

  async extract(input: ExtractionInput): Promise<ExtractionResult> {
    logger.info("Starting extraction", { fileName: input.fileName, mimeType: input.mimeType });

    const pages: PageContent[] = [];
    let rawText = "";
    let pageCount = 0;

    if (isPdfFile(input.mimeType)) {
      const pdfExtraction = await this.deps.pdfService.extract(input.buffer);
      rawText = pdfExtraction.text;
      pageCount = pdfExtraction.pageCount;

      if (isLikelyScannedPdf(rawText)) {
        logger.info("PDF appears to be scanned. Falling back to OCR.");
        const ocrPages = await this.deps.ocrService.extractTextFromPdf(input.buffer);
        pages.push(...ocrPages.map((page) => ({ pageNumber: page.pageNumber, text: page.text })));
        rawText = pages.map((page) => page.text).join("\n").trim();
        pageCount = pages.length;
      } else {
        pages.push(...pdfExtraction.pages.map((text, index) => ({ pageNumber: index + 1, text })));
      }
    } else {
      const imageResult = await this.deps.ocrService.extractTextFromImage(input.buffer);
      rawText = imageResult.text;
      pageCount = 1;
      pages.push(imageResult);
    }

    const tables = this.extractTables(pages);
    const { keyValues, confidences, language } = this.buildKeyValues(rawText);

    const result: ExtractionResult = {
      raw_text: rawText,
      pages,
      tables,
      metadata: {
        file_name: input.fileName,
        pages_count: pageCount,
        detected_language: language,
      },
      key_values: keyValues,
      key_values_confidence: confidences,
    };

    return result;
  }

  private extractTables(pages: PageContent[]): TableData[] {
    const tables: TableData[] = [];

    pages.forEach((page) => {
      const lines = page.text.split(/\r?\n/);
      let currentRows: string[][] = [];

      const flushCurrentRows = () => {
        if (currentRows.length > 1) {
          tables.push({ pageNumber: page.pageNumber, rows: currentRows });
        }
        currentRows = [];
      };

      lines.forEach((line) => {
        if (this.looksLikeTableRow(line)) {
          currentRows.push(this.splitRow(line));
        } else {
          flushCurrentRows();
        }
      });

      flushCurrentRows();
    });

    return tables;
  }

  private looksLikeTableRow(line: string): boolean {
    if (!line) return false;
    const trimmed = line.trim();
    if (!trimmed) return false;
    const hasPipes = trimmed.includes("|");
    const hasTabs = /\t/.test(trimmed);
    const multiSpaceColumns = trimmed.split(/\s{2,}/).length >= 3;
    return hasPipes || hasTabs || multiSpaceColumns;
  }

  private splitRow(line: string): string[] {
    if (line.includes("|")) {
      return line
        .split("|")
        .map((value) => value.trim())
        .filter(Boolean);
    }

    if (line.includes("\t")) {
      return line
        .split("\t")
        .map((value) => value.trim())
        .filter(Boolean);
    }

    return line
      .trim()
      .split(/\s{2,}/)
      .map((column) => column.trim())
      .filter(Boolean);
  }

  private buildKeyValues(text: string): {
    keyValues: InvoiceFields;
    confidences: InvoiceFieldConfidence;
    language: string;
  } {
    // Pipeline: normalize raw text -> split into clean lines -> detect language & fields.
    const normalizedText = this.normalizeText(text);
    const lines = this.splitIntoLines(normalizedText);
    const language = this.detectLanguage(normalizedText);

    const detections: Record<FieldKey, FieldDetection> = {
      invoice_number: this.detectInvoiceNumber(lines, normalizedText),
      invoice_date: this.detectDate(lines, normalizedText, ["invoice date", "issue date", "fakturadatum", "datum"]),
      due_date: this.detectDate(lines, normalizedText, ["due date", "due", "förfallodatum", "forfallodatum"]),
      total_amount: this.detectAmount(lines, ["total", "totalt", "amount due", "total belopp"], {
        preferHighest: true,
        fallbackConfidence: 0.4,
      }),
      subtotal_amount: this.detectAmount(lines, ["subtotal", "delsumma", "net total"], {
        preferHighest: false,
        fallbackConfidence: 0.3,
      }),
      vat_amount: this.detectAmount(lines, ["vat", "moms", "tax"], {
        preferHighest: false,
        fallbackConfidence: 0.3,
      }),
      currency: this.detectCurrency(lines, normalizedText),
      supplier_name: this.detectPartyName(lines, [/supplier/i, /leverantör/i, /leverantor/i, /from/i], {
        fallbackIndex: 0,
      }),
      customer_name: this.detectPartyName(
        lines,
        [/customer/i, /kund/i, /bill to/i, /ship to/i, /till/i],
        { fallbackIndex: 2 }
      ),
    };

    const keyValues = {} as InvoiceFields;
    const confidences = {} as InvoiceFieldConfidence;

    (Object.keys(detections) as FieldKey[]).forEach((field) => {
      keyValues[field] = detections[field].value;
      confidences[field] = this.clampConfidence(detections[field].confidence);
    });

    return { keyValues, confidences, language };
  }

  private normalizeText(text: string): string {
    return text.replace(/\r\n/g, "\n").replace(/\t/g, " ").replace(/[ ]{2,}/g, " ").trim();
  }

  private splitIntoLines(text: string): string[] {
    return text
      .split(/\n+/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }

  /**
   * Attempts to read an invoice number by scanning for well-known keywords first,
   * then falls back to generic INV-prefixed identifiers.
   */
  private detectInvoiceNumber(lines: string[], fullText: string): FieldDetection {
    const keywordPatterns = [
      /invoice\s*(?:no|number|nr|#)\s*[:#-]?\s*([A-Za-z0-9-]{3,})/i,
      /inv\.\s*[:#-]?\s*([A-Za-z0-9-]{3,})/i,
      /faktura(?:nr|nummer)?\s*[:#-]?\s*([A-Za-z0-9-]{3,})/i,
    ];

    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      if (lowerLine.includes("invoice date") || lowerLine.includes("fakturadatum")) {
        continue;
      }
      for (const pattern of keywordPatterns) {
        const match = line.match(pattern);
        if (match) {
          return { value: match[1], confidence: 0.9 };
        }
      }
    }

    const fallbackMatch = fullText.match(/\bINV[-\s]?[A-Z0-9]{3,}\b/i);
    if (fallbackMatch) {
      return { value: fallbackMatch[0], confidence: 0.5 };
    }

    return { value: null, confidence: 0 };
  }

  /**
   * Picks the first date near the provided keywords, or any date in the document as fallback.
   */
  private detectDate(lines: string[], fullText: string, keywords: string[]): FieldDetection {
    const keywordSet = keywords.map((keyword) => keyword.toLowerCase());

    for (const line of lines) {
      const normalizedLine = line.toLowerCase();
      if (keywordSet.some((keyword) => normalizedLine.includes(keyword))) {
        const match = line.match(DATE_PATTERN);
        if (match) {
          return { value: match[1], confidence: 0.85 };
        }
      }
    }

    const fallback = fullText.match(DATE_PATTERN);
    if (fallback) {
      return { value: fallback[1], confidence: 0.4 };
    }

    return { value: null, confidence: 0 };
  }

  /**
   * Collects amount candidates around the supplied keywords and ranks them.
   */
  private detectAmount(
    lines: string[],
    keywords: string[],
    options: { preferHighest: boolean; fallbackConfidence: number }
  ): FieldDetection {
    const keywordSet = keywords.map((keyword) => keyword.toLowerCase());
    const candidates: { amount: string; confidence: number; numericValue: number }[] = [];

    lines.forEach((line) => {
      const normalizedLine = line.toLowerCase();
      if (keywordSet.some((keyword) => normalizedLine.includes(keyword))) {
        const match = line.match(AMOUNT_PATTERN);
        if (match) {
          const normalizedAmount = this.normalizeAmount(match[1]);
          const numericValue = this.amountToNumber(normalizedAmount);
          candidates.push({ amount: normalizedAmount, confidence: 0.85, numericValue });
        }
      }
    });

    if (candidates.length > 0) {
      candidates.sort((a, b) =>
        options.preferHighest ? b.numericValue - a.numericValue : a.numericValue - b.numericValue
      );
      return { value: candidates[0].amount, confidence: candidates[0].confidence };
    }

    const fallbackMatch = lines.map((line) => line.match(AMOUNT_PATTERN)?.[1]).find(Boolean);
    if (fallbackMatch) {
      return { value: this.normalizeAmount(fallbackMatch), confidence: options.fallbackConfidence };
    }

    return { value: null, confidence: 0 };
  }

  private normalizeAmount(amount: string): string {
    const sanitized = amount.replace(/\s/g, "").replace(",", ".");
    return sanitized;
  }

  private amountToNumber(amount: string): number {
    const normalized = amount.replace(/\s/g, "").replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  /**
   * Extracts currency tokens either inline with the amounts or anywhere in the text.
   */
  private detectCurrency(lines: string[], fullText: string): FieldDetection {
    for (const line of lines) {
      const token = this.findCurrencyToken(line);
      if (token) {
        return { value: this.normalizeCurrency(token), confidence: 0.8 };
      }
    }

    const fallbackToken = this.findCurrencyToken(fullText);
    if (fallbackToken) {
      return { value: this.normalizeCurrency(fallbackToken), confidence: 0.5 };
    }

    return { value: null, confidence: 0 };
  }

  private findCurrencyToken(text: string): string | null {
    const lower = text.toLowerCase();
    for (const currency of KNOWN_CURRENCIES) {
      if (lower.includes(currency.toLowerCase())) {
        return currency;
      }
    }
    return null;
  }

  private normalizeCurrency(token: string): string {
    const upper = token.toUpperCase();
    if (upper === "$") return "USD";
    if (upper === "€") return "EUR";
    if (upper === "KR") return "SEK";
    return upper;
  }

  /**
   * Best-effort supplier/customer detection using keywords or fallback order.
   */
  private detectPartyName(
    lines: string[],
    keywordPatterns: RegExp[],
    options: { fallbackIndex: number }
  ): FieldDetection {
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (keywordPatterns.some((pattern) => pattern.test(line))) {
        const afterColon = line.split(/[:\-]/)[1];
        if (afterColon && afterColon.trim().length > 0) {
          return { value: afterColon.trim(), confidence: 0.8 };
        }
        const nextLine = lines[i + 1];
        if (nextLine) {
          return { value: nextLine.trim(), confidence: 0.7 };
        }
      }
    }

    const fallbackLine = lines[options.fallbackIndex];
    if (fallbackLine) {
      return { value: fallbackLine.trim(), confidence: 0.3 };
    }

    return { value: null, confidence: 0 };
  }

  private clampConfidence(value: number): number {
    if (!Number.isFinite(value)) {
      return 0;
    }
    return Math.min(1, Math.max(0, Number(value.toFixed(2))));
  }

  /**
   * Tiny heuristic-based language detector (focus on Swedish/English terms).
   */
  private detectLanguage(text: string): string {
    const lowerText = text.toLowerCase();
    const swedishSignals = ["faktura", "belopp", "förfallodatum", "org.nr", "kundnummer", "leverantör", "moms"];
    const englishSignals = ["invoice", "amount", "due date", "customer", "supplier", "tax", "subtotal"];

    const swedishScore = swedishSignals.reduce((score, word) => (lowerText.includes(word) ? score + 1 : score), 0);
    const englishScore = englishSignals.reduce((score, word) => (lowerText.includes(word) ? score + 1 : score), 0);

    if (swedishScore === 0 && englishScore === 0) {
      return "unknown";
    }

    return swedishScore >= englishScore ? "sv" : "en";
  }
}

export const extractionService = new ExtractionService();
