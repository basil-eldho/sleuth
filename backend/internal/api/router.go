package api

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"sleuth/internal/docker"
	"sleuth/internal/ws"
)

func NewRouter() http.Handler {
	dockerClient, err := docker.New()
	if err != nil {
		panic(err)
	}

	hub := ws.NewHub()
	go hub.Run()

	h := &handlers{docker: dockerClient, hub: hub}

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins: []string{"http://localhost:5173"},
		AllowedMethods: []string{"GET", "POST", "DELETE"},
	}))

	r.Get("/api/containers", h.listContainers)
	r.Get("/api/containers/{id}", h.inspectContainer)
	r.Get("/ws/logs/{id}", h.streamLogs)

	return r
}
