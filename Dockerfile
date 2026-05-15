# ── Stage 1: build frontend ───────────────────────────────────────────────────
FROM node:20-alpine AS ui
WORKDIR /app

RUN npm install -g pnpm

COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY frontend/ ./
RUN pnpm build

# ── Stage 2: build Go binary with embedded frontend ───────────────────────────
FROM golang:1.25-alpine AS build
WORKDIR /app

COPY backend/go.mod backend/go.sum ./
RUN go mod download

COPY backend/ ./

# Bake the production frontend into the binary
COPY --from=ui /app/dist ./internal/web/dist

RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o sleuth ./cmd/sleuth

# ── Stage 3: minimal runtime image ────────────────────────────────────────────
FROM alpine:3.20

RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app
COPY --from=build /app/sleuth .

EXPOSE 8080

CMD ["./sleuth"]
