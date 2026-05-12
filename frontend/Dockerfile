# Multi-stage build: ensin Node build-vaihe, sitten kopioi dist/ pelkkään volumeen
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig*.json vite.config.ts index.html ./
COPY public/ ./public/
COPY src/ ./src/

# Build (tuottaa /app/dist)
RUN npm run build

# Final stage: kontista vain dist:n kopiointi volumeen
FROM alpine:latest

WORKDIR /dist

COPY --from=builder /app/dist /dist

# Kopioidaan volumeen ja sammutaan — Compose kopioi tämän volume-mountin kautta Caddylle
CMD ["sh", "-c", "cp -r /dist/* /output/ && echo 'Frontend dist kopioitu volumeen'"]
