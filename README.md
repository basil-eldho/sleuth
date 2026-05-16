# Sleuth

Real-time Docker management UI for developers. Containers, images, stacks, networks, volumes — all in one terminal-aesthetic interface with live CPU/mem streaming.

![dark monochrome UI, monospace font, green accent](https://img.shields.io/badge/status-active-3dd68c?style=flat-square) ![Go](https://img.shields.io/badge/Go-1.25-00ADD8?style=flat-square&logo=go) ![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)

---

## Features

- **Containers** — live CPU/mem bars, start/stop/restart/remove, exec into shell, inspect, logs streaming, post-mortem view for exited containers
- **Images** — size, usage, which containers are using each image
- **Stacks** — compose project grouping, service dependency graph, aggregated logs
- **Networks** — driver, subnet, connected containers
- **Volumes** — driver, size, in-use status
- **System** — disk usage breakdown (images, containers, volumes, build cache), prune dialog
- **Command palette** — fuzzy-search across all views (`⌘K`)
- **Live stats** — WebSocket push every 2s, no polling

---

## Stack

| Layer | Choice |
|---|---|
| Backend | Go 1.25 + [chi](https://github.com/go-chi/chi) + [gorilla/websocket](https://github.com/gorilla/websocket) + Docker SDK |
| Frontend | React 18 + TypeScript (strict) + Vite |
| Styling | Tailwind CSS v4 — custom dark theme tokens |
| Server state | TanStack Query |
| Live / UI state | Zustand |
| Package manager | pnpm |

---

## Running locally

```bash
# 1. Backend — listens on :8080
cd backend && go run ./cmd/sleuth

# 2. Frontend — listens on :5173, proxies /api and /ws to :8080
cd frontend && pnpm dev
```

Both must be running. Vite's dev proxy handles `/api/*` and `/ws/*` forwarding — no CORS config needed.

### Makefile shortcuts

```bash
make dev-backend   # go run ./cmd/sleuth
make dev-frontend  # pnpm dev

make build         # pnpm build → embed dist into binary → ./sleuth
make docker        # build image: sleuth:latest
make run           # docker build + run (mounts /var/run/docker.sock)
```

---

## Docker (single binary)

The production build embeds the frontend into the Go binary via `//go:embed`:

```bash
# Build and run with Docker Compose
docker compose up

# Or build the image manually
docker build -t sleuth .
docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -p 8080:8080 \
  sleuth
```

Open `http://localhost:8080`.

---

## Project structure

```
sleuth/
├── Dockerfile                 # multi-stage: ui → build → alpine runtime
├── Makefile
├── docker-compose.yml
├── backend/
│   ├── cmd/sleuth/main.go     # entry: wires docker client, stats collector, hub, router
│   └── internal/
│       ├── api/
│       │   ├── handlers.go    # all HTTP + WS handlers
│       │   └── router.go      # chi routes + SPA fallback
│       ├── docker/
│       │   ├── client.go      # Docker SDK wrapper — all DTO-returning methods
│       │   └── dto.go         # frontend-compatible response types + helpers
│       ├── stats/
│       │   └── collector.go   # polls Docker every 2s, broadcasts to WS hub
│       ├── web/
│       │   └── embed.go       # embeds frontend/dist into binary
│       └── ws/
│           └── hub.go         # WebSocket hub — register/broadcast/ping
└── frontend/
    └── src/
        ├── api/client.ts      # typed fetch wrappers — never call fetch in components
        ├── components/        # UI — containers, images, stacks, networks, volumes, dialogs, ui/
        ├── hooks/             # TanStack Query + WebSocket hooks
        ├── lib/               # cn() utility, theme constants (SVG use only)
        ├── store/index.ts     # Zustand — nav, selection, dialogs, live stats, tweaks
        └── types/docker.ts    # TypeScript interfaces — single source of truth for API shape
```

---

## API

```
# Containers
GET    /api/containers              → ContainerDTO[]
GET    /api/containers/{id}         → ContainerDTO (full inspect, exit info, mounts)
POST   /api/containers/{id}/start
POST   /api/containers/{id}/stop
POST   /api/containers/{id}/restart
DELETE /api/containers/{id}
POST   /api/containers/{id}/exec    body: {cmd, shell} → {stdout, stderr}

# Resources
GET    /api/images                  → ImageDTO[]
GET    /api/networks                → NetworkDTO[]
GET    /api/volumes                 → VolumeDTO[]
GET    /api/stacks                  → StackDTO[]  (derived from compose labels)
GET    /api/system/df               → DiskUsageDTO
POST   /api/system/prune            body: {targets: string[]}

# WebSocket
WS     /ws/stats                    → LiveStats[] JSON frames every 2s
WS     /ws/logs/{id}                → log lines as text frames
WS     /ws/exec/{id}                → PTY session (resize events supported)
```

All responses are DTO structs — the Docker SDK types never leak to the frontend.

---

## Design

Dark monochrome with a single green accent (`#3dd68c`). Monospace font (JetBrains Mono) everywhere. No shadows, no gradients, no rounded corners > 4px.

Status colors: green = running, amber = warning, red = exited/error.
