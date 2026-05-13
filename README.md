# Sleuth

Real-time Docker management UI for developers. Containers, images, stacks, volumes, networks, and build cache — in one terminal-aesthetic interface.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS v4 |
| Server state | TanStack Query |
| Live/UI state | Zustand |
| Backend | Go + chi + gorilla/websocket |
| Package manager | pnpm |

## Running locally

```bash
# Backend — listens on :8080
cd backend && go run ./cmd/sleuth

# Frontend — listens on :5173, proxies /api and /ws to :8080
cd frontend && pnpm dev
```

Both need to be running. The Vite dev server handles the proxy.

## Project structure

```
sleuth/
├── backend/
│   ├── cmd/sleuth/          # main entry point
│   └── internal/
│       ├── api/             # HTTP handlers + chi router
│       ├── docker/          # Docker SDK client wrapper
│       └── ws/              # WebSocket hub
└── frontend/
    └── src/
        ├── api/             # typed fetch wrappers
        ├── components/      # UI components (see CLAUDE.md for full tree)
        ├── data/            # typed mock data (dev only)
        ├── hooks/           # TanStack Query hooks
        ├── lib/             # theme color constants
        ├── store/           # Zustand store
        └── types/           # TypeScript interfaces — API contract
```

## Backend API

```
GET  /api/containers        → Container[]
GET  /api/containers/{id}   → Container
WS   /ws/logs/{id}          → log lines (text frames)
WS   /ws/stats              → LiveStats[] JSON frames every 2s  [planned]
```

See `PLAN.md` for the full list of planned endpoints and the DTO mapping requirements.

## Development status

| Phase | Status | Description |
|---|---|---|
| 1 — Scaffold | ✅ Done | Vite + TS + Tailwind v4 + Zustand + TanStack Query wired up |
| 2 — UI atoms + layout | ✅ Done | Dot, TopBtn, Modal, CheckBox, CopyText, PortLink, MiniBar, Sidebar, ViewHeader, App shell |
| 3 — Views (mock data) | ✅ Done | ContainerTable, ImagesView, StacksView, StackGraph, NetworksView, VolumesView, BuildsView |
| 4 — Backend wiring | 🔲 | Replace mock with real API + WebSocket |
| 5 — Backend endpoints | 🔲 | Remaining Go endpoints + DTO layer |

## Contributing

See `CLAUDE.md` for coding standards, component patterns, and the Zustand store shape.
