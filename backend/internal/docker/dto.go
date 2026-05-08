package docker

import (
	"fmt"
	"strings"
	"time"
)

// ContainerDTO is the frontend-compatible container shape.
type ContainerDTO struct {
	ID       string            `json:"id"`
	Name     string            `json:"name"`
	Image    string            `json:"image"`
	Status   string            `json:"status"` // "running" | "exited" | "warning"
	CPU      float64           `json:"cpu"`
	Mem      float64           `json:"mem"`     // MB used
	MemLimit float64           `json:"memLimit"` // MB limit
	Ports    *string           `json:"ports"`
	Uptime   *string           `json:"uptime"`
	Hash     string            `json:"hash"` // first 12 chars of ID
	Created  string            `json:"created"`
	IP       string            `json:"ip"`
	Env      map[string]string `json:"env"`
	Stack    *string           `json:"stack"`
	Mounts   []BindMountDTO    `json:"mounts,omitempty"`
	ExitInfo *ExitInfoDTO      `json:"exitInfo,omitempty"`
}

// ImageDTO is the frontend-compatible image shape.
type ImageDTO struct {
	ID      string `json:"id"`
	Repo    string `json:"repo"`
	Tag     string `json:"tag"`
	Size    string `json:"size"`
	Created string `json:"created"`
	InUse   bool   `json:"inUse"`
}

// NetworkDTO is the frontend-compatible network shape.
type NetworkDTO struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	Driver     string `json:"driver"`
	Scope      string `json:"scope"`
	Subnet     string `json:"subnet"`
	Containers int    `json:"containers"`
}

// VolumeDTO is the frontend-compatible volume shape.
type VolumeDTO struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	Driver string `json:"driver"`
	Size   string `json:"size"`
	InUse  bool   `json:"inUse"`
}

// StackNodeDTO represents one service in a compose dependency graph.
type StackNodeDTO struct {
	ID      string   `json:"id"`
	Depends []string `json:"depends"`
	Status  string   `json:"status"`
}

// StackDTO is the frontend-compatible compose stack shape.
type StackDTO struct {
	ID       string         `json:"id"`
	Name     string         `json:"name"`
	File     string         `json:"file"`
	Services []string       `json:"services"`
	Graph    []StackNodeDTO `json:"graph"`
}

// DiskSectionDTO is one row in the disk-usage breakdown.
type DiskSectionDTO struct {
	Count       int    `json:"count"`
	Active      int    `json:"active"`
	Size        string `json:"size"`
	Reclaimable string `json:"reclaimable"`
}

// DiskUsageDTO is the frontend-compatible system df shape.
type DiskUsageDTO struct {
	Images     DiskSectionDTO `json:"images"`
	Containers DiskSectionDTO `json:"containers"`
	Volumes    DiskSectionDTO `json:"volumes"`
	BuildCache DiskSectionDTO `json:"buildCache"`
	Total      string         `json:"total"`
}

// PruneRequestDTO is the body for POST /api/system/prune.
type PruneRequestDTO struct {
	Targets []string `json:"targets"` // "images" | "containers" | "volumes" | "build cache"
}

// PruneResponseDTO is returned after a prune operation.
type PruneResponseDTO struct {
	SpaceReclaimed string `json:"spaceReclaimed"`
}

// BindMountDTO is a host↔container bind mount.
type BindMountDTO struct {
	Host      string `json:"host"`
	Container string `json:"container"`
	Mode      string `json:"mode"` // "ro" | "rw"
}

// ExitInfoDTO is populated for exited containers.
type ExitInfoDTO struct {
	Code     int      `json:"code"`
	Signal   string   `json:"signal"`
	Reason   string   `json:"reason"`
	KilledBy string   `json:"killedBy"`
	At       string   `json:"at"`
	Tail     []string `json:"tail"`
}

// LiveStats is pushed over WS /ws/stats every 2 s.
type LiveStats struct {
	ID     string  `json:"id"`
	CPU    float64 `json:"cpu"`
	Mem    float64 `json:"mem"`
	Status string  `json:"status"`
}

// ---- helpers ----------------------------------------------------------------

func containerStatus(state, health string) string {
	switch state {
	case "running":
		if health == "unhealthy" {
			return "warning"
		}
		return "running"
	case "paused", "restarting", "created":
		return "warning"
	default:
		return "exited"
	}
}

func humanAge(t time.Time) string {
	d := time.Since(t).Round(time.Second)
	switch {
	case d < time.Minute:
		return "just now"
	case d < time.Hour:
		n := int(d.Minutes())
		if n == 1 {
			return "1 minute ago"
		}
		return fmt.Sprintf("%d minutes ago", n)
	case d < 24*time.Hour:
		n := int(d.Hours())
		if n == 1 {
			return "1 hour ago"
		}
		return fmt.Sprintf("%d hours ago", n)
	case d < 7*24*time.Hour:
		n := int(d.Hours() / 24)
		if n == 1 {
			return "1 day ago"
		}
		return fmt.Sprintf("%d days ago", n)
	case d < 30*24*time.Hour:
		n := int(d.Hours() / (24 * 7))
		if n == 1 {
			return "1 week ago"
		}
		return fmt.Sprintf("%d weeks ago", n)
	default:
		n := int(d.Hours() / (24 * 30))
		if n == 1 {
			return "1 month ago"
		}
		return fmt.Sprintf("%d months ago", n)
	}
}

func humanUptime(startedAt string) *string {
	t, err := time.Parse(time.RFC3339Nano, startedAt)
	if err != nil || t.IsZero() || t.Year() < 2000 {
		return nil
	}
	d := time.Since(t).Round(time.Second)
	s := humanDuration(d)
	return &s
}

func humanDuration(d time.Duration) string {
	days := int(d.Hours()) / 24
	hours := int(d.Hours()) % 24
	mins := int(d.Minutes()) % 60
	secs := int(d.Seconds()) % 60
	switch {
	case days > 0:
		return fmt.Sprintf("%dd %dh", days, hours)
	case hours > 0:
		return fmt.Sprintf("%dh %dm", hours, mins)
	case mins > 0:
		return fmt.Sprintf("%dm %ds", mins, secs)
	default:
		return fmt.Sprintf("%ds", secs)
	}
}

func humanBytes(b int64) string {
	if b < 0 {
		return "—" // Docker uses -1 as sentinel for unknown size
	}
	if b == 0 {
		return "0 B"
	}
	const unit = 1024
	if b < unit {
		return fmt.Sprintf("%d B", b)
	}
	div, exp := int64(unit), 0
	for n := b / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	suffixes := []string{"KB", "MB", "GB", "TB"}
	return fmt.Sprintf("%.1f %s", float64(b)/float64(div), suffixes[exp])
}

func parseEnv(env []string) map[string]string {
	m := make(map[string]string, len(env))
	for _, e := range env {
		k, v, _ := strings.Cut(e, "=")
		m[k] = v
	}
	return m
}

func imageRepoTag(repoTags []string) (repo, tag string) {
	if len(repoTags) == 0 {
		return "<none>", "<none>"
	}
	repo, tag, found := strings.Cut(repoTags[0], ":")
	if !found {
		return repoTags[0], "latest"
	}
	return repo, tag
}

func composeFile(labels map[string]string) string {
	if v := labels["com.docker.compose.project.config_files"]; v != "" {
		// may be a comma-separated list; take the primary file
		return strings.SplitN(v, ",", 2)[0]
	}
	if v := labels["com.docker.compose.project.working_dir"]; v != "" {
		return v + "/docker-compose.yml"
	}
	return "docker-compose.yml"
}

func nullableString(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
