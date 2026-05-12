package api

import (
	"bufio"
	"encoding/json"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/gorilla/websocket"

	"sleuth/internal/docker"
	"sleuth/internal/stats"
	"sleuth/internal/ws"
)

var logUpgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type handlers struct {
	docker    *docker.Client
	collector *stats.Collector
	hub       *ws.Hub
}

// ---- containers -------------------------------------------------------------

func (h *handlers) listContainers(w http.ResponseWriter, r *http.Request) {
	list, err := h.docker.ListContainers(r.Context(), h.collector.Snapshot())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, list)
}

func (h *handlers) inspectContainer(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	dto, err := h.docker.InspectContainer(r.Context(), id, h.collector.Snapshot())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, dto)
}

func (h *handlers) startContainer(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.docker.StartContainer(r.Context(), id); err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *handlers) stopContainer(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.docker.StopContainer(r.Context(), id); err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *handlers) restartContainer(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.docker.RestartContainer(r.Context(), id); err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *handlers) execInContainer(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var body struct {
		Cmd   string `json:"cmd"`
		Shell string `json:"shell"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	if body.Shell == "" {
		body.Shell = "/bin/sh"
	}

	stdout, stderr, err := h.docker.ExecCommand(r.Context(), id, body.Shell, body.Cmd)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, map[string]string{"stdout": stdout, "stderr": stderr})
}

func (h *handlers) removeContainer(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.docker.RemoveContainer(r.Context(), id); err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ---- images, networks, volumes, stacks, system ------------------------------

func (h *handlers) listImages(w http.ResponseWriter, r *http.Request) {
	list, err := h.docker.ListImages(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, list)
}

func (h *handlers) listNetworks(w http.ResponseWriter, r *http.Request) {
	list, err := h.docker.ListNetworks(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, list)
}

func (h *handlers) listVolumes(w http.ResponseWriter, r *http.Request) {
	list, err := h.docker.ListVolumes(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, list)
}

func (h *handlers) listStacks(w http.ResponseWriter, r *http.Request) {
	list, err := h.docker.ListStacks(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, list)
}

func (h *handlers) pruneSystem(w http.ResponseWriter, r *http.Request) {
	var body docker.PruneRequestDTO
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	reclaimed, err := h.docker.Prune(r.Context(), body.Targets)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, docker.PruneResponseDTO{SpaceReclaimed: reclaimed})
}

func (h *handlers) diskUsage(w http.ResponseWriter, r *http.Request) {
	du, err := h.docker.DiskUsage(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, du)
}

// ---- websockets -------------------------------------------------------------

func (h *handlers) streamLogs(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	conn, err := logUpgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer conn.Close()

	logs, err := h.docker.StreamLogs(r.Context(), id)
	if err != nil {
		conn.WriteMessage(websocket.TextMessage, []byte("error: "+err.Error()))
		return
	}
	defer logs.Close()

	scanner := bufio.NewScanner(logs)
	for scanner.Scan() {
		if err := conn.WriteMessage(websocket.TextMessage, scanner.Bytes()); err != nil {
			return
		}
	}
}

func (h *handlers) streamStats(w http.ResponseWriter, r *http.Request) {
	h.hub.ServeStats(w, r)
}

func (h *handlers) execPTY(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	shell := r.URL.Query().Get("shell")
	if shell == "" {
		shell = "/bin/sh"
	}

	conn, err := logUpgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer conn.Close()

	execID, pty, err := h.docker.ExecPTY(r.Context(), id, shell)
	if err != nil {
		conn.WriteMessage(websocket.TextMessage, []byte("\r\nerror: "+err.Error()+"\r\n"))
		return
	}
	defer pty.Close()

	// browser → PTY (stdin)
	go func() {
		for {
			_, msg, err := conn.ReadMessage()
			if err != nil {
				return
			}

			// resize event: {"type":"resize","rows":N,"cols":N}
			if len(msg) > 0 && msg[0] == '{' {
				var ev struct {
					Type string `json:"type"`
					Rows uint   `json:"rows"`
					Cols uint   `json:"cols"`
				}
				if json.Unmarshal(msg, &ev) == nil && ev.Type == "resize" {
					h.docker.ResizePTY(r.Context(), execID, ev.Rows, ev.Cols)
					continue
				}
			}

			if _, err := pty.Conn.Write(msg); err != nil {
				return
			}
		}
	}()

	// PTY → browser (stdout+stderr combined, raw TTY stream)
	buf := make([]byte, 4096)
	for {
		n, err := pty.Reader.Read(buf)
		if n > 0 {
			if werr := conn.WriteMessage(websocket.BinaryMessage, buf[:n]); werr != nil {
				return
			}
		}
		if err != nil {
			return
		}
	}
}

// ---- helpers ----------------------------------------------------------------

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("api: encode response: %v", err)
	}
}

func writeError(w http.ResponseWriter, status int, err error) {
	log.Printf("api: %v", err)
	http.Error(w, err.Error(), status)
}
