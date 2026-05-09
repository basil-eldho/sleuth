package docker

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/api/types/image"
	"github.com/docker/docker/api/types/network"
	"github.com/docker/docker/api/types/volume"
	"github.com/docker/docker/client"
	"github.com/docker/docker/pkg/stdcopy"
	"github.com/docker/go-connections/nat"
)

// Client wraps the Docker SDK and exposes DTO-returning methods.
type Client struct {
	cli *client.Client
}

func New() (*Client, error) {
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return nil, err
	}
	return &Client{cli: cli}, nil
}

// ---- containers -------------------------------------------------------------

// ListContainers returns all containers mapped to frontend DTOs.
// CPU/mem come from the provided stats cache (may be zero on first call).
func (c *Client) ListContainers(ctx context.Context, stats map[string]LiveStats) ([]ContainerDTO, error) {
	raw, err := c.cli.ContainerList(ctx, container.ListOptions{All: true})
	if err != nil {
		return nil, err
	}

	out := make([]ContainerDTO, 0, len(raw))
	for _, r := range raw {
		dto := containerFromSummary(r, stats[r.ID])
		out = append(out, dto)
	}
	return out, nil
}

// InspectContainer returns full details for one container.
func (c *Client) InspectContainer(ctx context.Context, id string, stats map[string]LiveStats) (ContainerDTO, error) {
	r, err := c.cli.ContainerInspect(ctx, id)
	if err != nil {
		return ContainerDTO{}, err
	}
	var tail []string
	if r.State != nil && r.State.Status == "exited" {
		tail = c.logTail(ctx, id, 10)
	}
	return containerFromInspect(r, stats[r.ID], tail), nil
}

// logTail returns the last n lines of a container's logs.
func (c *Client) logTail(ctx context.Context, id string, n int) []string {
	rc, err := c.cli.ContainerLogs(ctx, id, container.LogsOptions{
		ShowStdout: true,
		ShowStderr: true,
		Tail:       fmt.Sprintf("%d", n),
	})
	if err != nil {
		return nil
	}
	defer rc.Close()

	raw, err := io.ReadAll(rc)
	if err != nil || len(raw) == 0 {
		return nil
	}

	// Try demultiplex (non-TTY containers have an 8-byte frame header per message).
	var combined bytes.Buffer
	_, demuxErr := stdcopy.StdCopy(&combined, &combined, bytes.NewReader(raw))
	var text string
	if demuxErr == nil {
		text = combined.String()
	} else {
		text = string(raw) // TTY container — raw text
	}

	var lines []string
	for _, line := range strings.Split(text, "\n") {
		line = strings.TrimSpace(line)
		if line != "" {
			lines = append(lines, line)
		}
	}
	return lines
}

func (c *Client) StartContainer(ctx context.Context, id string) error {
	return c.cli.ContainerStart(ctx, id, container.StartOptions{})
}

func (c *Client) StopContainer(ctx context.Context, id string) error {
	timeout := 10
	return c.cli.ContainerStop(ctx, id, container.StopOptions{Timeout: &timeout})
}

func (c *Client) RestartContainer(ctx context.Context, id string) error {
	timeout := 10
	return c.cli.ContainerRestart(ctx, id, container.StopOptions{Timeout: &timeout})
}

func (c *Client) RemoveContainer(ctx context.Context, id string) error {
	return c.cli.ContainerRemove(ctx, id, container.RemoveOptions{Force: true})
}

// ExecCommand runs a one-shot command inside a running container via the
// chosen shell and returns stdout and stderr separately.
func (c *Client) ExecCommand(ctx context.Context, id, shell, cmd string) (stdout, stderr string, err error) {
	exec, err := c.cli.ContainerExecCreate(ctx, id, types.ExecConfig{
		Cmd:          []string{shell, "-c", cmd},
		AttachStdout: true,
		AttachStderr: true,
	})
	if err != nil {
		return "", "", err
	}

	resp, err := c.cli.ContainerExecAttach(ctx, exec.ID, types.ExecStartCheck{})
	if err != nil {
		return "", "", err
	}
	defer resp.Close()

	var outBuf, errBuf bytes.Buffer
	if _, err = stdcopy.StdCopy(&outBuf, &errBuf, resp.Reader); err != nil {
		return "", "", err
	}
	return outBuf.String(), errBuf.String(), nil
}

// ExecPTY creates an interactive PTY session inside a running container.
// It returns the exec ID and the attached hijacked connection.
func (c *Client) ExecPTY(ctx context.Context, id, shell string) (execID string, resp types.HijackedResponse, err error) {
	exec, err := c.cli.ContainerExecCreate(ctx, id, types.ExecConfig{
		Cmd:          []string{shell},
		AttachStdin:  true,
		AttachStdout: true,
		AttachStderr: true,
		Tty:          true,
	})
	if err != nil {
		return "", types.HijackedResponse{}, err
	}

	resp, err = c.cli.ContainerExecAttach(ctx, exec.ID, types.ExecStartCheck{Tty: true})
	if err != nil {
		return "", types.HijackedResponse{}, err
	}
	return exec.ID, resp, nil
}

// ResizePTY resizes the TTY for an exec session.
func (c *Client) ResizePTY(ctx context.Context, execID string, rows, cols uint) error {
	return c.cli.ContainerExecResize(ctx, execID, container.ResizeOptions{
		Height: rows,
		Width:  cols,
	})
}

func (c *Client) StreamLogs(ctx context.Context, id string) (io.ReadCloser, error) {
	return c.cli.ContainerLogs(ctx, id, container.LogsOptions{
		ShowStdout: true,
		ShowStderr: true,
		Follow:     true,
		Timestamps: true,
	})
}

// ---- stats (used by collector) ----------------------------------------------

// CollectStats calls the Docker stats API for every running container
// concurrently and returns a LiveStats slice.
func (c *Client) CollectStats(ctx context.Context) []LiveStats {
	running, err := c.cli.ContainerList(ctx, container.ListOptions{All: false})
	if err != nil || len(running) == 0 {
		return nil
	}

	type result struct {
		stats LiveStats
		ok    bool
	}

	ch := make(chan result, len(running))
	var wg sync.WaitGroup

	for _, r := range running {
		wg.Add(1)
		go func(id, state, health string) {
			defer wg.Done()
			ls, err := c.singleStats(ctx, id, state, health)
			ch <- result{ls, err == nil}
		}(r.ID, r.State, r.Status)
	}

	wg.Wait()
	close(ch)

	out := make([]LiveStats, 0, len(running))
	for res := range ch {
		if res.ok {
			out = append(out, res.stats)
		}
	}
	return out
}

func (c *Client) singleStats(ctx context.Context, id, state, health string) (LiveStats, error) {
	resp, err := c.cli.ContainerStats(ctx, id, false)
	if err != nil {
		return LiveStats{}, err
	}
	defer resp.Body.Close()

	var s types.StatsJSON
	if err := json.NewDecoder(resp.Body).Decode(&s); err != nil {
		return LiveStats{}, err
	}

	cpu := cpuPercent(s)
	mem := memUsedMB(s.MemoryStats)

	return LiveStats{
		ID:     id,
		CPU:    roundOne(cpu),
		Mem:    roundOne(mem),
		Status: containerStatus(state, health),
	}, nil
}

// ---- images -----------------------------------------------------------------

func (c *Client) ListImages(ctx context.Context) ([]ImageDTO, error) {
	// build set of image IDs currently used by containers
	containers, err := c.cli.ContainerList(ctx, container.ListOptions{All: true})
	if err != nil {
		return nil, err
	}
	inUse := make(map[string]bool, len(containers))
	for _, r := range containers {
		inUse[r.ImageID] = true
	}

	imgs, err := c.cli.ImageList(ctx, image.ListOptions{All: false})
	if err != nil {
		return nil, err
	}

	out := make([]ImageDTO, 0, len(imgs))
	for _, img := range imgs {
		repo, tag := imageRepoTag(img.RepoTags)
		out = append(out, ImageDTO{
			ID:      img.ID,
			Repo:    repo,
			Tag:     tag,
			Size:    humanBytes(img.Size),
			Created: humanAge(time.Unix(img.Created, 0)),
			InUse:   inUse[img.ID],
		})
	}
	return out, nil
}

// ---- networks ---------------------------------------------------------------

func (c *Client) ListNetworks(ctx context.Context) ([]NetworkDTO, error) {
	nets, err := c.cli.NetworkList(ctx, types.NetworkListOptions{})
	if err != nil {
		return nil, err
	}

	out := make([]NetworkDTO, 0, len(nets))
	for _, n := range nets {
		subnet := ""
		if len(n.IPAM.Config) > 0 {
			subnet = n.IPAM.Config[0].Subnet
		}
		out = append(out, NetworkDTO{
			ID:         n.ID[:12],
			Name:       n.Name,
			Driver:     n.Driver,
			Scope:      n.Scope,
			Subnet:     subnet,
			Containers: len(n.Containers),
		})
	}
	return out, nil
}

// ---- volumes ----------------------------------------------------------------

func (c *Client) ListVolumes(ctx context.Context) ([]VolumeDTO, error) {
	// fetch volume sizes via system df
	df, err := c.cli.DiskUsage(ctx, types.DiskUsageOptions{})
	sizesMap := make(map[string]string)
	inUseMap := make(map[string]bool)
	if err == nil {
		for _, v := range df.Volumes {
			sizesMap[v.Name] = humanBytes(v.UsageData.Size)
			inUseMap[v.Name] = v.UsageData.RefCount > 0
		}
	}

	resp, err := c.cli.VolumeList(ctx, volume.ListOptions{Filters: filters.Args{}})
	if err != nil {
		return nil, err
	}

	out := make([]VolumeDTO, 0, len(resp.Volumes))
	for _, v := range resp.Volumes {
		size := sizesMap[v.Name]
		if size == "" {
			size = "—"
		}
		out = append(out, VolumeDTO{
			ID:     v.Name,
			Name:   v.Name,
			Driver: v.Driver,
			Size:   size,
			InUse:  inUseMap[v.Name],
		})
	}
	return out, nil
}

// ---- stacks -----------------------------------------------------------------

// ListStacks derives compose stacks from container labels.
func (c *Client) ListStacks(ctx context.Context) ([]StackDTO, error) {
	containers, err := c.cli.ContainerList(ctx, container.ListOptions{All: true})
	if err != nil {
		return nil, err
	}

	type serviceInfo struct {
		status string
		health string
	}

	type stackBuild struct {
		file     string
		services map[string]serviceInfo
	}

	stacks := make(map[string]*stackBuild)

	for _, r := range containers {
		project := r.Labels["com.docker.compose.project"]
		if project == "" {
			continue
		}
		service := r.Labels["com.docker.compose.service"]
		if service == "" {
			continue
		}

		sb, ok := stacks[project]
		if !ok {
			sb = &stackBuild{
				file:     composeFile(r.Labels),
				services: make(map[string]serviceInfo),
			}
			stacks[project] = sb
		}
		sb.services[service] = serviceInfo{status: r.State, health: r.Status}
	}

	out := make([]StackDTO, 0, len(stacks))
	for name, sb := range stacks {
		services := make([]string, 0, len(sb.services))
		graph := make([]StackNodeDTO, 0, len(sb.services))

		for svc, info := range sb.services {
			services = append(services, svc)
			graph = append(graph, StackNodeDTO{
				ID:      svc,
				Depends: []string{},
				Status:  containerStatus(info.status, info.health),
			})
		}
		sort.Strings(services)

		out = append(out, StackDTO{
			ID:       name,
			Name:     name,
			File:     sb.file,
			Services: services,
			Graph:    graph,
		})
	}

	sort.Slice(out, func(i, j int) bool { return out[i].Name < out[j].Name })
	return out, nil
}

// ---- system prune -----------------------------------------------------------

// Prune removes unused Docker objects for the requested target categories and
// returns a human-readable string of the total space reclaimed.
func (c *Client) Prune(ctx context.Context, targets []string) (string, error) {
	set := make(map[string]bool, len(targets))
	for _, t := range targets {
		set[t] = true
	}

	var total uint64
	f := filters.NewArgs()

	if set["containers"] {
		r, err := c.cli.ContainersPrune(ctx, f)
		if err != nil {
			return "", fmt.Errorf("prune containers: %w", err)
		}
		total += r.SpaceReclaimed
	}
	if set["images"] {
		r, err := c.cli.ImagesPrune(ctx, f)
		if err != nil {
			return "", fmt.Errorf("prune images: %w", err)
		}
		total += r.SpaceReclaimed
	}
	if set["volumes"] {
		r, err := c.cli.VolumesPrune(ctx, f)
		if err != nil {
			return "", fmt.Errorf("prune volumes: %w", err)
		}
		total += r.SpaceReclaimed
	}
	if set["build cache"] {
		r, err := c.cli.BuildCachePrune(ctx, types.BuildCachePruneOptions{All: true})
		if err != nil {
			return "", fmt.Errorf("prune build cache: %w", err)
		}
		total += r.SpaceReclaimed
	}

	return humanBytes(int64(total)), nil
}

// ---- system df --------------------------------------------------------------

func (c *Client) DiskUsage(ctx context.Context) (DiskUsageDTO, error) {
	du, err := c.cli.DiskUsage(ctx, types.DiskUsageOptions{})
	if err != nil {
		return DiskUsageDTO{}, err
	}

	var (
		imgSize, imgReclaim         int64
		imgCount, imgActive         int
		ctrSize, ctrReclaim         int64
		ctrCount, ctrActive         int
		volSize, volReclaim         int64
		volCount, volActive         int
		cacheSize, cacheReclaim     int64
		cacheCount, cacheActive     int
	)

	for _, img := range du.Images {
		imgCount++
		imgSize += img.Size
		if img.Containers > 0 {
			imgActive++
		} else {
			imgReclaim += img.Size
		}
	}

	for _, ctr := range du.Containers {
		ctrCount++
		ctrSize += ctr.SizeRootFs
		if ctr.State == "running" {
			ctrActive++
		} else {
			ctrReclaim += ctr.SizeRootFs
		}
	}

	for _, v := range du.Volumes {
		volCount++
		if v.UsageData.Size > 0 {
			volSize += v.UsageData.Size
			if v.UsageData.RefCount > 0 {
				volActive++
			} else {
				volReclaim += v.UsageData.Size
			}
		}
	}

	for _, bc := range du.BuildCache {
		cacheCount++
		cacheSize += bc.Size
		if bc.InUse {
			cacheActive++
		} else {
			cacheReclaim += bc.Size
		}
	}

	total := imgSize + ctrSize + volSize + cacheSize

	return DiskUsageDTO{
		Images: DiskSectionDTO{
			Count:       imgCount,
			Active:      imgActive,
			Size:        humanBytes(imgSize),
			Reclaimable: humanBytes(imgReclaim),
		},
		Containers: DiskSectionDTO{
			Count:       ctrCount,
			Active:      ctrActive,
			Size:        humanBytes(ctrSize),
			Reclaimable: humanBytes(ctrReclaim),
		},
		Volumes: DiskSectionDTO{
			Count:       volCount,
			Active:      volActive,
			Size:        humanBytes(volSize),
			Reclaimable: humanBytes(volReclaim),
		},
		BuildCache: DiskSectionDTO{
			Count:       cacheCount,
			Active:      cacheActive,
			Size:        humanBytes(cacheSize),
			Reclaimable: humanBytes(cacheReclaim),
		},
		Total: humanBytes(total),
	}, nil
}

// ---- internal mapping helpers -----------------------------------------------

func containerFromSummary(r types.Container, ls LiveStats) ContainerDTO {
	name := ""
	if len(r.Names) > 0 {
		name = strings.TrimPrefix(r.Names[0], "/")
	}

	status := containerStatus(r.State, r.Status)

	var ports *string
	if parts := formatPorts(r.Ports); parts != "" {
		ports = &parts
	}

	ip := primaryIP(r.NetworkSettings)

	hash := r.ID
	if len(hash) > 12 {
		hash = hash[:12]
	}

	return ContainerDTO{
		ID:       r.ID,
		Name:     name,
		Image:    r.Image,
		Status:   status,
		CPU:      ls.CPU,
		Mem:      ls.Mem,
		MemLimit: 0, // not available from list; provided by inspect
		Ports:    ports,
		Uptime:   uptimeFromState(r.State, r.Status),
		Hash:     hash,
		Created:  humanAge(time.Unix(r.Created, 0)),
		IP:       ip,
		Env:      map[string]string{},
		Stack:    nullableString(r.Labels["com.docker.compose.project"]),
	}
}

func containerFromInspect(r types.ContainerJSON, ls LiveStats, tail []string) ContainerDTO {
	name := strings.TrimPrefix(r.Name, "/")

	state := ""
	health := ""
	startedAt := ""
	if r.State != nil {
		state = r.State.Status
		startedAt = r.State.StartedAt
		if r.State.Health != nil {
			health = r.State.Health.Status
		}
	}

	status := containerStatus(state, health)

	var (
		ports    *string
		ip       string
		memLimit float64
	)

	if r.NetworkSettings != nil {
		if parts := formatPortBindings(r.NetworkSettings.Ports); parts != "" {
			ports = &parts
		}
		ip = primaryIPFromSettings(r.NetworkSettings.Networks)
	}

	if r.HostConfig != nil {
		memLimit = float64(r.HostConfig.Memory) / 1024 / 1024
	}

	hash := r.ID
	if len(hash) > 12 {
		hash = hash[:12]
	}

	env := map[string]string{}
	if r.Config != nil {
		env = parseEnv(r.Config.Env)
	}

	created := ""
	if t, err := time.Parse(time.RFC3339Nano, r.Created); err == nil {
		created = humanAge(t)
	}

	// Bind mounts
	var mounts []BindMountDTO
	for _, m := range r.Mounts {
		if string(m.Type) != "bind" {
			continue
		}
		mode := "rw"
		if !m.RW {
			mode = "ro"
		}
		mounts = append(mounts, BindMountDTO{
			Host:      m.Source,
			Container: m.Destination,
			Mode:      mode,
		})
	}

	// Exit info for stopped containers
	var exitInfo *ExitInfoDTO
	if r.State != nil && r.State.Status == "exited" {
		at := ""
		if t, err := time.Parse(time.RFC3339Nano, r.State.FinishedAt); err == nil {
			at = humanAge(t)
		}
		reason := r.State.Error
		killedBy := ""
		if r.State.OOMKilled {
			reason = "OOMKilled — exceeded memory limit"
			killedBy = "oom"
		}
		exitInfo = &ExitInfoDTO{
			Code:     r.State.ExitCode,
			Signal:   exitSignal(r.State.ExitCode),
			Reason:   reason,
			KilledBy: killedBy,
			At:       at,
			Tail:     tail,
		}
	}

	return ContainerDTO{
		ID:       r.ID,
		Name:     name,
		Image:    r.Config.Image,
		Status:   status,
		CPU:      ls.CPU,
		Mem:      ls.Mem,
		MemLimit: memLimit,
		Ports:    ports,
		Uptime:   humanUptime(startedAt),
		Hash:     hash,
		Created:  created,
		IP:       ip,
		Env:      env,
		Stack:    nullableString(r.Config.Labels["com.docker.compose.project"]),
		Mounts:   mounts,
		ExitInfo: exitInfo,
	}
}

func exitSignal(code int) string {
	if code <= 128 {
		return ""
	}
	names := map[int]string{
		1: "SIGHUP", 2: "SIGINT", 3: "SIGQUIT", 6: "SIGABRT",
		9: "SIGKILL", 13: "SIGPIPE", 15: "SIGTERM",
	}
	if name, ok := names[code-128]; ok {
		return name
	}
	return fmt.Sprintf("SIG%d", code-128)
}

func formatPorts(ports []types.Port) string {
	var parts []string
	seen := make(map[string]bool)
	for _, p := range ports {
		if p.PublicPort == 0 {
			continue
		}
		s := fmt.Sprintf("%d:%d", p.PublicPort, p.PrivatePort)
		if !seen[s] {
			parts = append(parts, s)
			seen[s] = true
		}
	}
	return strings.Join(parts, ", ")
}

func formatPortBindings(ports nat.PortMap) string {
	var parts []string
	seen := make(map[string]bool)
	for containerPort, bindings := range ports {
		for _, b := range bindings {
			if b.HostPort == "" {
				continue
			}
			private := strings.SplitN(string(containerPort), "/", 2)[0]
			s := fmt.Sprintf("%s:%s", b.HostPort, private)
			if !seen[s] {
				parts = append(parts, s)
				seen[s] = true
			}
		}
	}
	sort.Strings(parts)
	return strings.Join(parts, ", ")
}

func primaryIP(ns *types.SummaryNetworkSettings) string {
	if ns == nil {
		return "—"
	}
	for _, n := range ns.Networks {
		if n.IPAddress != "" {
			return n.IPAddress
		}
	}
	return "—"
}

func primaryIPFromSettings(nets map[string]*network.EndpointSettings) string {
	for _, n := range nets {
		if n != nil && n.IPAddress != "" {
			return n.IPAddress
		}
	}
	return "—"
}

// uptimeFromState returns nil — StartedAt is not available from ContainerList.
// The inspect endpoint (containerFromInspect) provides the real value.
func uptimeFromState(_, _ string) *string { return nil }

// ---- stats math -------------------------------------------------------------

func cpuPercent(s types.StatsJSON) float64 {
	cpuDelta := float64(s.CPUStats.CPUUsage.TotalUsage) - float64(s.PreCPUStats.CPUUsage.TotalUsage)
	sysDelta := float64(s.CPUStats.SystemUsage) - float64(s.PreCPUStats.SystemUsage)
	if sysDelta <= 0 || cpuDelta <= 0 {
		return 0
	}
	numCPUs := float64(s.CPUStats.OnlineCPUs)
	if numCPUs == 0 {
		numCPUs = float64(len(s.CPUStats.CPUUsage.PercpuUsage))
	}
	if numCPUs == 0 {
		numCPUs = 1
	}
	return (cpuDelta / sysDelta) * numCPUs * 100.0
}

func memUsedMB(ms types.MemoryStats) float64 {
	cache := ms.Stats["cache"]
	if cache == 0 {
		cache = ms.Stats["inactive_file"] // cgroup v2
	}
	used := ms.Usage
	if used > cache {
		used -= cache
	}
	return float64(used) / 1024 / 1024
}

func roundOne(f float64) float64 {
	return float64(int(f*10+0.5)) / 10
}
