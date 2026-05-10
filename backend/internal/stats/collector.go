// Package stats runs a background goroutine that polls Docker every 2 s,
// caches per-container CPU/mem, and broadcasts the results to the WS hub.
package stats

import (
	"context"
	"encoding/json"
	"log"
	"sync"
	"time"

	"sleuth/internal/docker"
	"sleuth/internal/ws"
)

// Collector polls Docker stats on a fixed interval, keeps a snapshot cache,
// and broadcasts LiveStats slices to the WebSocket hub.
type Collector struct {
	client *docker.Client
	hub    *ws.Hub

	mu    sync.RWMutex
	cache map[string]docker.LiveStats
}

func New(client *docker.Client, hub *ws.Hub) *Collector {
	return &Collector{
		client: client,
		hub:    hub,
		cache:  make(map[string]docker.LiveStats),
	}
}

// Run blocks until ctx is cancelled. Call it in its own goroutine.
func (c *Collector) Run(ctx context.Context) {
	c.tick(ctx) // immediate first collection

	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			c.tick(ctx)
		}
	}
}

// Snapshot returns the current cached stats for all containers.
func (c *Collector) Snapshot() map[string]docker.LiveStats {
	c.mu.RLock()
	defer c.mu.RUnlock()

	out := make(map[string]docker.LiveStats, len(c.cache))
	for k, v := range c.cache {
		out[k] = v
	}
	return out
}

func (c *Collector) tick(ctx context.Context) {
	stats := c.client.CollectStats(ctx)
	if len(stats) == 0 {
		return
	}

	c.mu.Lock()
	for _, s := range stats {
		c.cache[s.ID] = s
	}
	c.mu.Unlock()

	payload, err := json.Marshal(stats)
	if err != nil {
		log.Printf("stats: marshal: %v", err)
		return
	}
	c.hub.Broadcast(payload)
}
