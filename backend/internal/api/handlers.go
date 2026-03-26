package api

import (
	"bufio"
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/gorilla/websocket"
	"sleuth/internal/docker"
	"sleuth/internal/ws"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type handlers struct {
	docker *docker.Client
	hub    *ws.Hub
}

func (h *handlers) listContainers(w http.ResponseWriter, r *http.Request) {
	containers, err := h.docker.ListContainers(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(containers)
}

func (h *handlers) inspectContainer(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	info, err := h.docker.InspectContainer(r.Context(), id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(info)
}

func (h *handlers) streamLogs(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	conn, err := upgrader.Upgrade(w, r, nil)
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
