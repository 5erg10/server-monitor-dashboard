# ---- Build client ----
FROM node:20-alpine AS client-builder
WORKDIR /app
COPY package.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/
RUN npm install
COPY client/ ./client/
RUN npm run build --workspace=client

# ---- Production server ----
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

# Install dependencies for native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++

COPY package.json ./
COPY server/package.json ./server/
RUN npm install --workspace=server --omit=dev

COPY server/ ./server/
COPY --from=client-builder /app/client/dist ./public

# Data volume for SQLite
RUN mkdir -p /app/data

EXPOSE 3500

CMD ["node", "server/src/index.js"]
