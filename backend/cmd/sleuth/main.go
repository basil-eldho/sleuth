package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"sleuth/internal/api"
	"sleuth/internal/docker"
	"sleuth/internal/stats"
	"sleuth/internal/ws"
)

// addr is the listen address, overridable with PORT (defaults to :8080).
func addr() string {
	if p := os.Getenv("PORT"); p != "" {
		return ":" + p
	}
	return ":8080"
}

func main() {
	dockerClient, err := docker.New()
	if err != nil {
		log.Fatalf("docker: %v", err)
	}

	hub := ws.NewHub()
	collector := stats.New(dockerClient, hub)

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	go hub.Run()
	go collector.Run(ctx)

	router := api.NewRouter(dockerClient, collector, hub)

	srv := &http.Server{Addr: addr(), Handler: router}

	go func() {
		<-ctx.Done()
		log.Println("sleuth: shutting down")
		srv.Shutdown(context.Background())
	}()

	log.Printf("sleuth: listening on %s", srv.Addr)
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("sleuth: %v", err)
	}
}
