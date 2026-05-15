# Sleuth — Roadmap

## Status

| Phase | Description | Status |
|---|---|---|
| Phase 1 | Scaffold — Vite, TypeScript, Tailwind, Zustand, TanStack Query | ✅ Complete |
| Phase 2 | UI atoms + layout — Sidebar, ViewHeader, Dot, TopBtn, Modal, etc. | ✅ Complete |
| Phase 3 | All views with mock data — ContainerDetail, ImageDetail, dialogs, stacks | ✅ Complete |
| Phase 4 | Wire frontend to backend | 🔲 Not started |
| Phase 5 | Backend new endpoints | 🔲 Not started |

---

## Phase 4 — Frontend wiring

Depends on Phase 5 backend work. Can be done in parallel once each endpoint lands.

### F1 — API client
- [ ] Implement `frontend/src/api/client.ts` — typed `fetch` wrappers, base URL, JSON parsing, error handling

### F2 — TanStack Query hooks
- [ ] `useContainers.ts` — `GET /api/containers`, poll every 5s
- [ ] `useContainer.ts` — `GET /api/containers/{id}`, poll every 3s when detail is open
- [ ] `useLogs.ts` — `WS /ws/logs/{id}`, accumulate lines, cleanup on unmount
- [ ] `useImages.ts` — `GET /api/images`, refetch on focus
- [ ] `useNetworks.ts` — `GET /api/networks`
- [ ] `useVolumes.ts` — `GET /api/volumes`
- [ ] `useStacks.ts` — `GET /api/stacks`
- [ ] `useDiskUsage.ts` — `GET /api/system/df`

### F3 — Replace mock data in views
- [ ] `App.tsx` — replace `CONTAINERS` import with `useContainers()` hook
- [ ] `App.tsx` — replace `IMAGES` import with `useImages()` hook
- [ ] `App.tsx` — replace `NETWORKS` with `useNetworks()`, `VOLUMES` with `useVolumes()`, `STACKS` with `useStacks()`
- [ ] `App.tsx` — replace `DISK_USAGE` with `useDiskUsage()` in `Sidebar`
- [ ] `ContainerDetail.tsx` — replace `MOCK_LOGS` with `useLogs(id)` hook
- [ ] `ContainerDetail.tsx` — replace `BIND_MOUNTS`, `CONTAINER_DIFF`, `EXIT_INFO` with data from `useContainer(id)`
- [ ] `ImageDetail.tsx` — replace `IMAGE_LAYERS`, `IMAGE_USED_BY` with data from `useImages()`
- [ ] `StacksView.tsx` — replace mock containers with live data

### F4 — Container actions
- [ ] Wire `■ stop` button → `POST /api/containers/{id}/stop`
- [ ] Wire `▶ start` button → `POST /api/containers/{id}/start`
- [ ] Wire `↺ restart` button → `POST /api/containers/{id}/restart`
- [ ] Wire `✕ remove` button → `DELETE /api/containers/{id}`
- [ ] Wire `BatchActionBar` bulk stop / restart / remove
- [ ] Invalidate `useContainers` query after each action

### F5 — Live stats WebSocket
- [ ] Wire `initLiveStats()` in Zustand store to `WS /ws/stats`
- [ ] Replace static CPU/mem values in `ContainerTable` with `liveStats[id]` overlay
- [ ] Replace static CPU/mem in `StatsTab` sparklines with live data

---

## Phase 5 — Backend

### B1 — DTO mapping layer *(unblocks everything — do first)*

The existing endpoints return raw Docker SDK types. Map them to the frontend contract before anything else.

- [ ] Create `ContainerDTO` struct with all frontend fields
- [ ] `status` — map Docker states: `restarting` / `paused` / `dead` / unhealthy → `"warning"`
- [ ] `hash` — `container.ID[:12]`
- [ ] `uptime` — human duration from `State.StartedAt`; `null` if not running
- [ ] `created` — human duration from `Created` timestamp
- [ ] `stack` — label `com.docker.compose.project`; `null` if absent
- [ ] `ports` — format bindings as `"hostPort:containerPort"` joined by `", "`; `null` if none
- [ ] `ip` — from `NetworkSettings.Networks[*].IPAddress`; `"—"` if none
- [ ] `env` — parse `Config.Env` slice (`"KEY=VALUE"`) into `map[string]string`
- [ ] Apply mapping to `GET /api/containers`
- [ ] Apply mapping to `GET /api/containers/{id}`

### B2 — CPU / memory computation

- [ ] Background goroutine that polls `ContainerStats` for all running containers every 2s
- [ ] Cache the previous stat snapshot per container ID
- [ ] `cpu` = `(cpuDelta / systemDelta) * numCPUs * 100`
- [ ] `mem` = `MemoryStats.Usage / 1_048_576` (bytes → MB)
- [ ] `memLimit` = `MemoryStats.Limit / 1_048_576` (bytes → MB)
- [ ] Expose cached values in `GET /api/containers` and `GET /api/containers/{id}`

### B3 — Container actions

- [ ] `POST /api/containers/{id}/start` → `ContainerStart`, return `204`
- [ ] `POST /api/containers/{id}/stop` → `ContainerStop`, return `204`
- [ ] `POST /api/containers/{id}/restart` → `ContainerRestart`, return `204`
- [ ] `DELETE /api/containers/{id}` → `ContainerRemove` (force: true), return `204`

### B4 — Live stats WebSocket

- [ ] `WS /ws/stats` endpoint
- [ ] Reuse background stats goroutine from B2
- [ ] Broadcast `[]LiveStatsDTO` JSON frame to all connected clients every 2s via existing hub
- [ ] `LiveStatsDTO` shape: `{ id, cpu, mem, status }`

### B5 — Images endpoint

- [ ] `GET /api/images` → `[]ImageDTO`
- [ ] `id` — full sha256 ID
- [ ] `repo` / `tag` — parse from `RepoTags[0]`; handle untagged (`<none>`)
- [ ] `size` — human string from `Size` bytes
- [ ] `created` — human duration from `Created` timestamp
- [ ] `inUse` — `true` if any container's `Image` field matches this image ID or repo:tag

### B6 — Networks endpoint

- [ ] `GET /api/networks` → `[]NetworkDTO`
- [ ] `subnet` — from `IPAM.Config[0].Subnet`; `"—"` if none
- [ ] `containers` — count of containers attached to this network

### B7 — Volumes endpoint

- [ ] `GET /api/volumes` → `[]VolumeDTO`
- [ ] `size` — from `UsageData.Size` (requires `system df --volumes`); `"—"` if unavailable
- [ ] `inUse` — cross-reference container mounts

### B8 — Stacks endpoint

Stacks are not a Docker API concept — derive from container labels.

- [ ] `GET /api/stacks` → `[]StackDTO`
- [ ] Group all containers by label `com.docker.compose.project`
- [ ] `file` — from label `com.docker.compose.project.config_files`
- [ ] `services` — unique values of label `com.docker.compose.service` within the project
- [ ] `graph[].depends` — from label `com.docker.compose.depends_on` if present; else `[]`
- [ ] `graph[].status` — worst status across service containers

### B9 — Disk usage endpoint

- [ ] `GET /api/system/df` → `DiskUsageDTO`
- [ ] Use `client.DiskUsage()` and map counts, sizes, reclaimable amounts
- [ ] Format all byte values as human strings (`"4.6 GB"`, `"184 MB"`, etc.)

### B10 — Error responses

- [ ] All error paths return `{"error": "message"}` JSON with appropriate HTTP status
- [ ] `404` for unknown container / image / volume / network ID
- [ ] `500` for Docker daemon errors

---

## DTO reference

Full TypeScript shapes the backend must match exactly — see `frontend/src/types/docker.ts`.

Key computed fields summary:

| Field | Source | Notes |
|---|---|---|
| `status` | `State.Status` | Must be exactly `"running"` / `"exited"` / `"warning"` |
| `cpu` | Stats delta | `(cpuDelta / systemDelta) * numCPUs * 100` |
| `mem` | Stats | `MemoryStats.Usage / 1_048_576` |
| `memLimit` | Stats | `MemoryStats.Limit / 1_048_576` |
| `hash` | `ID` | `ID[:12]` |
| `uptime` | `State.StartedAt` | Human duration; `null` if exited |
| `created` | `Created` | Human duration |
| `stack` | Label | `com.docker.compose.project` or `null` |
| `ports` | `NetworkSettings.Ports` | `"3000:3000, 80:80"` or `null` |
| `ip` | `NetworkSettings.Networks` | First non-empty IP or `"—"` |
| `env` | `Config.Env` | Parse `KEY=VALUE` → `map[string]string` |

---

## Implementation order

```
B1 (DTO mapping)
  └── B2 (CPU/mem stats)
        ├── B3 (actions)          ← unblocks F4
        ├── B4 (WS /ws/stats)     ← unblocks F5
        ├── B5 (images)
        ├── B6 (networks)
        ├── B7 (volumes)
        ├── B8 (stacks)
        └── B9 (system/df)

F1 (api/client) can start now
F2 + F3 can start per-endpoint as each backend task lands
```
