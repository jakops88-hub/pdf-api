# PDF Structured Data API

## Overview
REST API that extracts structured text, tables, metadata, and invoice-like key/value pairs from PDFs or images. Digital PDFs are parsed with `pdf-parse`. Scans fall back to OCR using `pdfjs-dist`, `canvas`, and `tesseract.js`. Results include best-effort invoice fields plus confidence scores so the extraction pipeline can evolve.

## Requirements
- Node.js 20+
- npm 10+
- Native build tools for `canvas` (`npm install --global --production windows-build-tools` on Windows, Xcode CLT on macOS, `build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev` on Linux).

## Environment
Copy `.env.example` to `.env` and adjust values.

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `3000` | HTTP port |
| `LOG_LEVEL` | `info` | Winston log level |
| `OCR_LANGUAGES` | `eng+swe` | Languages passed to Tesseract |
| `ALLOWED_API_KEYS` | `dev-key-1,dev-key-2` | Comma-separated API keys authorized for `x-api-key` header (leave blank to disable auth) |

> Clients must send a matching `x-api-key: <KEY>` header when accessing `POST /extract`. `/health` stays public.

## Installation
```bash
npm install
```

## Scripts
```bash
npm run dev    # ts-node-dev hot reloading
npm run build  # compile TypeScript to dist/
npm start      # run compiled server
npm test       # jest test suite
```

## Development
```bash
npm run dev
```
Upload PDFs/images to `http://localhost:3000/extract`.

## Testing
```bash
npm test
```

## Example Requests
Health:
```bash
curl http://localhost:3000/health
```

Extraction (replace `sample.pdf` with your file):
```bash
curl -X POST http://localhost:3000/extract \
  -H "x-api-key: dev-key-1" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@sample.pdf"
```
