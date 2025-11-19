## Deploying pdf-structured-data-api on Railway

These steps assume you already have a Railway account and the Railway CLI installed (`npm i -g @railway/cli`).

### 1. Clone & prepare locally

```bash
git clone https://github.com/<your-org>/pdf-structured-data-api.git
cd pdf-structured-data-api
# Install dependencies if you want to validate locally
npm install
npm run build
npm test
```

### 2. Login to Railway

```bash
railway login
```

### 3. Create a project & service (Docker deploy)

```bash
railway init --service pdf-api
railway up --service pdf-api --dockerfile Dockerfile
```

The provided `Dockerfile` installs the system libraries that `canvas`, `tesseract.js`, and `sharp` require, then builds and launches the app.

### 4. Configure environment variables

```bash
railway variables set PORT=3000
railway variables set LOG_LEVEL=info
railway variables set OCR_LANGUAGES="eng+swe"
railway variables set ALLOWED_API_KEYS="api_key_one,api_key_two"
```

Add any other vars you need (e.g. `API_KEY` if you use it for outbound services).

### 5. Promote the deployment

```bash
railway deploy
railway status
```

Once the deployment is healthy, Railway gives you a public URL (e.g. `https://pdf-api.up.railway.app`). Update RapidAPI / clients to point there.

### Notes

- The `Dockerfile` exposes port `3000`, matching the `PORT` value.
- For CI/CD you can use `railway up --service pdf-api --dockerfile Dockerfile` in GitHub Actions or similar.
- If you also want to deploy `ui-to-tailwind-api`, follow the same process but you can omit the heavy system packages or create a separate Dockerfile in that repo.
