package api

import (
	"io/fs"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"sleuth/internal/docker"
	"sleuth/internal/stats"
	"sleuth/internal/web"
	"sleuth/internal/ws"
)

func NewRouter(dockerClient *docker.Client, collector *stats.Collector, hub *ws.Hub) http.Handler {
	h := &handlers{docker: dockerClient, collector: collector, hub: hub}

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins: []string{"http://localhost:5173"},
		AllowedMethods: []string{"GET", "POST", "DELETE"},
	}))

	// containers
	r.Get("/api/containers", h.listContainers)
	r.Get("/api/containers/{id}", h.inspectContainer)
	r.Post("/api/containers/{id}/start", h.startContainer)
	r.Post("/api/containers/{id}/stop", h.stopContainer)
	r.Post("/api/containers/{id}/restart", h.restartContainer)
	r.Delete("/api/containers/{id}", h.removeContainer)
	r.Post("/api/containers/{id}/exec", h.execInContainer)

	// other entities
	r.Get("/api/images", h.listImages)
	r.Get("/api/networks", h.listNetworks)
	r.Get("/api/volumes", h.listVolumes)
	r.Get("/api/stacks", h.listStacks)
	r.Get("/api/system/df", h.diskUsage)
	r.Post("/api/system/prune", h.pruneSystem)

	// websockets
	r.Get("/ws/logs/{id}", h.streamLogs)
	r.Get("/ws/stats", h.streamStats)
	r.Get("/ws/exec/{id}", h.execPTY)

	// embedded frontend — only active when dist/index.html exists (production build)
	if distFS, err := fs.Sub(web.FS, "dist"); err == nil {
		if _, err := distFS.Open("index.html"); err == nil {
			r.Handle("/*", spaHandler(distFS))
		}
	}

	return r
}

// spaHandler serves static files from fsys and falls back to index.html for
// any path that doesn't match a real file (client-side navigation).
func spaHandler(fsys fs.FS) http.Handler {
	fileServer := http.FileServer(http.FS(fsys))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/")
		f, err := fsys.Open(path)
		if err != nil {
			r = r.Clone(r.Context())
			r.URL.Path = "/"
			fileServer.ServeHTTP(w, r)
			return
		}
		f.Close()
		fileServer.ServeHTTP(w, r)
	})
}
