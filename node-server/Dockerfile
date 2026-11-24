FROM node:22-alpine AS builder

WORKDIR /builder

COPY frontend/package*.json ./

RUN npm ci

COPY frontend .

RUN npm run build

FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY src ./src

COPY --from=builder /builder/dist ./public

ENTRYPOINT [ "node", "./src/server.js" ]