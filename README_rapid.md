# AI UI Rebuilder

I built this service for teams that keep asking “can I get that landing page in code by tomorrow?” Upload HTML or point to a public URL and the API hands back a set of Tailwind or Bootstrap blocks, each tagged with a semantic label (hero, pricing table, feature grid, etc.). You also get a ready-to-paste Tailwind config and SCSS variables so the theme matches first try.

- **Tailwind + Bootstrap output** – pick the framework you use today.
- **Theme export** – grab the colors/fonts straight into your project.
- **Headless fetch** – flip `renderMode` to `headless` when you need a fully rendered DOM; the API uses Playwright under the hood and falls back gracefully if a site takes too long.
- **Semantic blocks** – each component includes `semanticLabel` so you can slot it into AI workflows or auto-builders.

## Auth
All requests require `x-api-key`. Generate a key via Rapid (pricing plan) and send it as a header.

## Endpoints
### GET /health
Quick uptime check.

### POST /rebuild
Body fields:
- `url` (string, optional): public page to fetch. Required if `html` is missing.
- `html` (string, optional): raw HTML. Required if `url` is missing.
- `framework` (string, optional): `tailwind` (default) or `bootstrap`.
- `renderMode` (string, optional): `static` (default) or `headless`.

Example:
```bash
curl -X POST https://your-render-url/rebuild \
  -H "x-api-key: <YOUR_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.prisjakt.se",
    "framework": "tailwind",
    "renderMode": "headless"
  }'
```

Response excerpt:
```json
{
  "framework": "tailwind",
  "generatedMarkup": "<div class=\"min-h-screen ...",
  "components": [
    {
      "semanticLabel": "hero",
      "html": "<section class=\"text-center ...">",
      "sourceHint": "hero"
    }
  ],
  "theme": {
    "primaryColor": "#0f172a",
    "fonts": ["Inter", "Poppins"]
  },
  "themeConfig": {
    "tailwind": "export default { theme: { extend: { colors: { ... } }}};",
    "scss": "$color-primary: #0f172a; ..."
  },
  "metadata": {
    "sourceUrl": "https://www.prisjakt.se",
    "tokens": 342,
    "markupCharacters": 5768
  }
}
```

## Tips
- If you only need the markup, stick to `renderMode: "static"`. Use `headless` for JS-heavy pages.
- Empty pages still generate sensible hero/section/footer blocks thanks to fallback heuristics.
- Each call rebuilds one page. Multi-URL batching = multiple requests.