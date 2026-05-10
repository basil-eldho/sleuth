package main

import (
	"context"
	"log"
	"net/http"
	"os/signal"
	"syscall"

	"sleuth/internal/api"
	"sleuth/internal/docker"
	"sleuth/internal/stats"
	"sleuth/internal/ws"
)

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

	srv := &http.Server{Addr: ":8080", Handler: router}

	go func() {
		<-ctx.Done()
		log.Println("sleuth: shutting down")
		srv.Shutdown(context.Background())
	}()

	log.Println("sleuth: listening on :8080")
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("sleuth: %v", err)
	}
}
