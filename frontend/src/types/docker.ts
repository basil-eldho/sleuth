// All API response shapes — single source of truth.
// Backend must return JSON that exactly matches these interfaces.

export type ContainerStatus = 'running' | 'exited' | 'warning';

export interface Container {
  id: string;
  name: string;
  image: string;
  status: ContainerStatus;
  cpu: number;           // percentage, e.g. 12.4
  mem: number;           // MB used
  memLimit: number;      // MB limit
  ports: string | null;  // "3000:3000, 80:80" or null
  uptime: string | null; // human string or null if exited
  hash: string;          // first 12 chars of container ID
  created: string;       // human string, e.g. "2 weeks ago"
  ip: string;
  env: Record<string, string>;
  stack: string | null;  // docker compose project name, or null
  exitInfo?: ExitInfo;   // populated by backend when status === 'exited'
  mounts?: BindMount[];  // populated by backend on full inspect
}

export interface StackNode {
  id: string;            // service name
  depends: string[];
  status: ContainerStatus;
}

export interface Stack {
  id: string;
  name: string;
  file: string;          // compose file path
  services: string[];
  graph: StackNode[];
}

export interface Image {
  id: string;            // sha256:...
  repo: string;
  tag: string;
  size: string;          // human string, e.g. "184 MB"
  created: string;
  inUse: boolean;
}

export interface Network {
  id: string;
  name: string;
  driver: string;
  scope: string;
  subnet: string;
  containers: number;
}

export interface Volume {
  id: string;
  name: string;
  driver: string;
  size: string;
  inUse: boolean;
}

export interface DiskSection {
  count: number;
  active: number;
  size: string;
  reclaimable: string;
}

export interface DiskUsage {
  images: DiskSection;
  containers: DiskSection;
  volumes: DiskSection;
  buildCache: DiskSection;
  total: string;
}

export interface BindMount {
  host: string;
  container: string;
  mode: 'ro' | 'rw';
}

export interface ExitInfo {
  code: number;
  signal: string;
  reason: string;
  killedBy: string;
  at: string;
  tail: string[];
}

// Pushed over WS /ws/stats every 2s
export interface LiveStats {
  id: string;
  cpu: number;
  mem: number;
  status: ContainerStatus;
}
