import request from "supertest";
import app from "../src/app.js";

describe("POST /extract", () => {
  it("returns 400 when no file is provided", async () => {
    const response = await request(app).post("/extract").field("notes", "missing");

    expect(response.status).toBe(400);
    expect(response.body.error).toBeDefined();
  });
});
