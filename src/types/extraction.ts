export interface PageContent {
  pageNumber: number;
  text: string;
}

export interface TableData {
  pageNumber: number;
  rows: string[][];
}

export interface InvoiceFields {
  invoice_number: string | null;
  invoice_date: string | null;
  due_date: string | null;
  total_amount: string | null;
  subtotal_amount: string | null;
  vat_amount: string | null;
  currency: string | null;
  supplier_name: string | null;
  customer_name: string | null;
}

export interface InvoiceFieldConfidence {
  invoice_number: number;
  invoice_date: number;
  due_date: number;
  total_amount: number;
  subtotal_amount: number;
  vat_amount: number;
  currency: number;
  supplier_name: number;
  customer_name: number;
}

export interface ExtractionMetadata {
  file_name: string;
  pages_count: number;
  detected_language: string;
}

export interface ExtractionResult {
  raw_text: string;
  pages: PageContent[];
  tables: TableData[];
  metadata: ExtractionMetadata;
  key_values: InvoiceFields;
  key_values_confidence: InvoiceFieldConfidence;
}

export interface ExtractionInput {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
}
