# AI UI Rebuilder API

Transforms any public web page (URL or raw HTML) into a semantic component catalog plus Tailwind/Bootstrap-ready markup, complete with theme exports. Built for AI agents, QA teams, and no-code builders that need to reverse-engineer UI instantly.

## Highlights
- **Dual frameworks**: output Tailwind or Bootstrap markup.
- **Theme exports**: auto-generated `tailwind.config.js` snippet + SCSS variables.
- **Semantic components**: every block includes a `semanticLabel` (hero, navigation, pricing_table, etc.).
- **Headless render (Playwright)**: opt-in `renderMode: "headless"` renders SPAs before rebuilding (can be toggled via env).
- **Secure**: `x-api-key` auth, configurable via environment variables.

## Stack
Node.js 20+, TypeScript, Express, axios, jsdom, cheerio, Playwright, Jest.

## Setup
```bash
npm install
cp .env.example .env   # configure ports + API keys + headless flag
```

| Variable | Description |
| --- | --- |
| `PORT` | HTTP port (default 4000, Render overrides automatically) |
| `LOG_LEVEL` | Winston log level |
| `ALLOWED_API_KEYS` | Comma-separated `x-api-key` values (leave blank to disable auth) |
| `HTML_FETCH_TIMEOUT_MS` | Timeout for remote fetch (ms) |
| `ALLOW_HEADLESS_FETCH` | `true/false` to permit Playwright rendering |
| `HEADLESS_FETCH_TIMEOUT_MS` | Playwright timeout in ms (default 45000). Falls back to static fetch on failure |

## Scripts
```bash
npm run dev    # tsx watch src/server.ts
npm run build  # compile to dist/
npm start      # node dist/server.js
npm test       # jest suites
```

## API
### `GET /health`
```json
{ "status": "ok", "version": "1.0.0" }
```

### `POST /rebuild`
Headers: `x-api-key: <one of ALLOWED_API_KEYS>`

Body (JSON):
```json
{
  "url": "https://www.prisjakt.se",   // optional if html provided
  "html": "<html>...</html>",        // optional if url provided
  "framework": "tailwind",           // or "bootstrap"
  "renderMode": "static"             // optional: "headless" uses Playwright
}
```

Response (excerpt):
```json
{
  "framework": "tailwind",
  "generatedMarkup": "<div class=\"min-h-screen ...",
  "components": [
    {
      "id": "...",
      "type": "hero",
      "semanticLabel": "hero",
      "label": "hero:section",
      "html": "..."
    }
  ],
  "theme": {
    "primaryColor": "#0f172a",
    "secondaryColor": "#1d4ed8",
    "accentColor": "#f97316",
    "fonts": ["Inter", "Poppins"],
    "backgroundColor": "#f3f4f6"
  },
  "themeConfig": {
    "tailwind": "export default { theme: { extend: { colors: { ... } }}};",
    "scss": "$color-primary: #0f172a; ..."
  },
  "metadata": {
    "sourceUrl": "https://www.prisjakt.se",
    "generatedAt": "2025-11-19T06:32:31.425Z",
    "tokens": 342,
    "markupCharacters": 5094
  }
}
```

## Testing
Run `npm test` to execute:
- `layoutAnalyzer` heuristics
- `domSanitizer` hardening
- `rebuildRoute` covering auth, Tailwind/Bootstrap output, validation (including semantic/theme config).

## Deployment Tips
1. Expose env vars via Render/Heroku etc (especially `ALLOWED_API_KEYS` and `ALLOW_HEADLESS_FETCH`).
2. Build command: `npm install && npm run build`. Start command: `npm start`.
3. For headless rendering on Render, enable the env flag; Playwright is already part of dependencies.
4. Railway deployment is supported out-of-the-box via the included `Dockerfile`. See [`docs/RAILWAY_DEPLOYMENT.md`](docs/RAILWAY_DEPLOYMENT.md) for CLI instructions.
5. Rate limit or log per key if you plan to monetize on Rapid API.

Happy rebuilding!
