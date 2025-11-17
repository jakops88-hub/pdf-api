import { describe, expect, it, jest } from "@jest/globals";
import { ExtractionService, type ExtractionDependencies } from "../src/services/extractionService.js";

const createServiceWithText = (text: string) => {
  const deps: ExtractionDependencies = {
    pdfService: {
      extract: jest.fn().mockResolvedValue({
        text,
        pages: [text],
        pageCount: 1,
      }),
    } as unknown as ExtractionDependencies["pdfService"],
    ocrService: {
      extractTextFromPdf: jest.fn(),
      extractTextFromImage: jest.fn(),
    } as unknown as ExtractionDependencies["ocrService"],
  };

  return new ExtractionService(deps);
};

describe("ExtractionService invoice heuristics", () => {
  it("handles a Swedish-like invoice with localized keywords", async () => {
    const swedishText = `
      Faktura
      Leverantör: Svenska Företaget AB
      Kund: Superkund AB
      Fakturanr: SF-2024-001
      Fakturadatum: 2024-03-01
      Förfallodatum: 2024-03-30
      Delsumma 8 000,00 kr
      Moms 2 000,00 kr
      Totalt belopp 10 000,00 SEK
    `;

    const service = createServiceWithText(swedishText);
    const result = await service.extract({
      buffer: Buffer.from("noop"),
      fileName: "swedish.pdf",
      mimeType: "application/pdf",
    });

    expect(result.metadata.detected_language).toBe("sv");
    expect(result.key_values.invoice_number).toBe("SF-2024-001");
    expect(result.key_values.invoice_date).toBe("2024-03-01");
    expect(result.key_values.due_date).toBe("2024-03-30");
    expect(result.key_values.total_amount).toBe("10000.00");
    expect(result.key_values.subtotal_amount).toBe("8000.00");
    expect(result.key_values.vat_amount).toBe("2000.00");
    expect(result.key_values.currency).toBe("SEK");
    expect(result.key_values.supplier_name).toBe("Svenska Företaget AB");
    expect(result.key_values.customer_name).toBe("Superkund AB");
    expect(result.key_values_confidence.invoice_number).toBeGreaterThan(0.7);
    expect(result.key_values_confidence.total_amount).toBeGreaterThan(0.7);
  });

  it("handles an English invoice with standard headings", async () => {
    const englishText = `
      INVOICE
      Supplier: ACME Corp
      Customer: Stellar Client LLC
      Invoice No: INV-7788
      Invoice Date: 2024-02-10
      Due Date: 2024-02-25
      Subtotal 1200.00 USD
      VAT 300.00
      Total Amount Due 1500.00 USD
    `;

    const service = createServiceWithText(englishText);
    const result = await service.extract({
      buffer: Buffer.from("noop"),
      fileName: "english.pdf",
      mimeType: "application/pdf",
    });

    expect(result.metadata.detected_language).toBe("en");
    expect(result.key_values.invoice_number).toBe("INV-7788");
    expect(result.key_values.total_amount).toBe("1500.00");
    expect(result.key_values.subtotal_amount).toBe("1200.00");
    expect(result.key_values.vat_amount).toBe("300.00");
    expect(result.key_values.currency).toBe("USD");
    expect(result.key_values.supplier_name).toBe("ACME Corp");
    expect(result.key_values.customer_name).toBe("Stellar Client LLC");
    expect(result.key_values_confidence.currency).toBeGreaterThan(0.6);
  });

  it("handles noisy invoices with missing data", async () => {
    const noisyText = `
      Random note about services rendered
      Customer name maybe missing
      Total ??? 42,99
    `;

    const service = createServiceWithText(noisyText);
    const result = await service.extract({
      buffer: Buffer.from("noop"),
      fileName: "noisy.pdf",
      mimeType: "application/pdf",
    });

    expect(result.key_values.invoice_number).toBeNull();
    expect(result.key_values.invoice_date).toBeNull();
    expect(result.key_values.total_amount).toBe("42.99");
    expect(result.key_values.currency).toBeNull();
    expect(result.key_values_confidence.invoice_number).toBe(0);
    expect(result.key_values_confidence.total_amount).toBeGreaterThan(0);
  });
});
