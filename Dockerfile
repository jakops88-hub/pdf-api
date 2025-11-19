FROM node:18-bullseye-slim

WORKDIR /app

# System libraries required by canvas, sharp, and tesseract
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev && \
    rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies (including dev deps for the build)
RUN npm ci

COPY src ./src
COPY tests ./tests

RUN npm run build && npm prune --omit=dev

ENV NODE_ENV=production \
    PORT=3000

EXPOSE 3000

CMD ["npm", "run", "start"]
