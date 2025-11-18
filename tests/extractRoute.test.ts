import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { Express } from "express";
import request from "supertest";
import { extractionService } from "../src/services/extractionService.js";

const mockExtractionResult = {
  raw_text: "mock",
  pages: [],
  tables: [],
  metadata: { file_name: "mock.pdf", pages_count: 1, detected_language: "en" },
  key_values: {
    invoice_number: null,
    invoice_date: null,
    due_date: null,
    total_amount: null,
    subtotal_amount: null,
    vat_amount: null,
    currency: null,
    supplier_name: null,
    customer_name: null,
  },
  key_values_confidence: {
    invoice_number: 0,
    invoice_date: 0,
    due_date: 0,
    total_amount: 0,
    subtotal_amount: 0,
    vat_amount: 0,
    currency: 0,
    supplier_name: 0,
    customer_name: 0,
  },
};

const mockExtract = jest.fn(async () => mockExtractionResult);

let app: Express;

beforeAll(async () => {
  jest.spyOn(extractionService, "extract").mockImplementation(mockExtract);
  const mod = await import("../src/app.js");
  app = mod.default;
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe("POST /extract API key auth", () => {
  beforeEach(() => {
    mockExtract.mockClear();
  });

  it("returns 401 when no API key is provided", async () => {
    const response = await request(app).post("/extract");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: "Unauthorized" });
  });

  it("returns 401 when API key is invalid", async () => {
    const response = await request(app).post("/extract").set("x-api-key", "wrong-key");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: "Unauthorized" });
  });

  it("returns 400 when file is missing even with valid API key", async () => {
    const response = await request(app).post("/extract").set("x-api-key", "valid-key");

    expect(response.status).toBe(400);
    expect(response.body.error).toBeDefined();
  });

  it("returns 200 when API key is valid and file is provided", async () => {
    const response = await request(app)
      .post("/extract")
      .set("x-api-key", "valid-key")
      .attach("file", Buffer.from("dummy-pdf"), { filename: "invoice.pdf", contentType: "application/pdf" });

    expect(mockExtract).toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(response.body.metadata.file_name).toBe("mock.pdf");
  });
});
