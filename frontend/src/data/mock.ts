import type {
  Container, Stack, Image, Network, Volume,
  DiskUsage, Build, BindMount, FileDiff, ExitInfo, ImageLayer,
} from '../types/docker';

export interface RecentCmd {
  id: string;
  cmd: string;
  ranAt: string;
  exit: number;
}

export interface HostPort {
  port: number;
  pid: number;
  process: string;
}

export const CONTAINERS: Container[] = [
  { id: 'api-gateway',   name: 'api-gateway',   image: 'myapp/api-gateway:2.1.4',     status: 'running', cpu: 12.4, mem: 247, memLimit: 512, ports: '3000:3000',            uptime: '14d 5h 18m', hash: 'a3b21c0e6f7d', created: '2 weeks ago',  ip: '172.18.0.4',  env: { NODE_ENV: 'production', LOG_LEVEL: 'info', DB_HOST: 'postgres-main' }, stack: 'myapp' },
  { id: 'auth-service',  name: 'auth-service',  image: 'myapp/auth:1.4.2',            status: 'running', cpu: 3.1,  mem: 160, memLimit: 512, ports: '127.0.0.1:3001:3001', uptime: '14d 5h 18m', hash: 'f8e7d6c5b4a3', created: '2 weeks ago',  ip: '172.18.0.5',  env: { NODE_ENV: 'production', JWT_SECRET: '***', SESSION_TTL: '3600' }, stack: 'myapp' },
  { id: 'frontend-app',  name: 'frontend-app',  image: 'myapp/frontend:3.2.0',        status: 'running', cpu: 4.2,  mem: 203, memLimit: 512, ports: '8080:8080',            uptime: '14d 4h 8m',  hash: 'c9d8e7f6a5b4', created: '6 days ago',   ip: '172.18.0.6',  env: { NODE_ENV: 'production', API_URL: 'http://api-gateway:3000' }, stack: 'myapp' },
  { id: 'worker-queue',  name: 'worker-queue',  image: 'myapp/worker:0.9.1',          status: 'warning', cpu: 78.3, mem: 690, memLimit: 512, ports: null,                   uptime: '6h 12m',     hash: '12ab34cd56ef', created: '6 hours ago',  ip: '172.18.0.7',  env: { NODE_ENV: 'production', CONCURRENCY: '8' }, stack: 'myapp' },
  { id: 'nginx-proxy',   name: 'nginx-proxy',   image: 'nginx:1.25-alpine',           status: 'running', cpu: 1.2,  mem: 48,  memLimit: 512, ports: '80:80, 443:443',       uptime: '14d 6h 32m', hash: '0fedcba98765', created: '3 weeks ago',  ip: '172.18.0.2',  env: { WORKER_PROCESSES: 'auto' }, stack: 'myapp' },
  { id: 'postgres-main', name: 'postgres-main', image: 'postgres:16.2-alpine',        status: 'running', cpu: 8.7,  mem: 361, memLimit: 512, ports: '127.0.0.1:5432:5432', uptime: '14d 6h 44m', hash: '5566aabbccdd', created: '3 weeks ago',  ip: '172.18.0.3',  env: { POSTGRES_DB: 'production', POSTGRES_USER: 'app' }, stack: 'data' },
  { id: 'redis-cache',   name: 'redis-cache',   image: 'redis:7.2.4-alpine',          status: 'running', cpu: 0.8,  mem: 43,  memLimit: 512, ports: '127.0.0.1:6379:6379', uptime: '14d 6h 44m', hash: 'deadbeefcafe', created: '3 weeks ago',  ip: '172.18.0.8',  env: { MAXMEMORY: '256mb' }, stack: 'data' },
  { id: 'elasticsearch', name: 'elasticsearch', image: 'elasticsearch:8.12.2',        status: 'exited',  cpu: 0,    mem: 0,   memLimit: 990, ports: '9200:9200',            uptime: null,         hash: '0badc0ffee0d', created: '2 months ago', ip: '—',           env: { 'discovery.type': 'single-node' }, stack: 'data' },
  { id: 'kafka-broker',  name: 'kafka-broker',  image: 'confluentinc/cp-kafka:7.6.0', status: 'running', cpu: 22.1, mem: 495, memLimit: 512, ports: '9092:9092',            uptime: '14d 6h 44m', hash: 'feedfacecafe', created: '3 weeks ago',  ip: '172.18.0.9',  env: { KAFKA_BROKER_ID: '1' }, stack: 'data' },
  { id: 'grafana',       name: 'grafana',       image: 'grafana/grafana:10.3.3',      status: 'running', cpu: 2.1,  mem: 229, memLimit: 512, ports: '3001:3000',            uptime: '14d 5h 32m', hash: 'b16b00b500df', created: '2 weeks ago',  ip: '172.18.0.10', env: { GF_SECURITY_ADMIN_PASSWORD: '***' }, stack: 'monitoring' },
];

export const STACKS: Stack[] = [
  {
    id: 'myapp', name: 'myapp', file: '~/projects/myapp/docker-compose.yml',
    services: ['api-gateway', 'auth-service', 'frontend-app', 'worker-queue', 'nginx-proxy'],
    graph: [
      { id: 'nginx-proxy',  depends: ['frontend-app', 'api-gateway'], status: 'running' },
      { id: 'frontend-app', depends: ['api-gateway'],                  status: 'running' },
      { id: 'api-gateway',  depends: ['auth-service'],                 status: 'running' },
      { id: 'auth-service', depends: [],                               status: 'running' },
      { id: 'worker-queue', depends: ['api-gateway'],                  status: 'warning' },
    ],
  },
  {
    id: 'data', name: 'data', file: '~/projects/myapp/compose.data.yml',
    services: ['postgres-main', 'redis-cache', 'elasticsearch', 'kafka-broker'],
    graph: [
      { id: 'postgres-main', depends: [], status: 'running' },
      { id: 'redis-cache',   depends: [], status: 'running' },
      { id: 'kafka-broker',  depends: [], status: 'running' },
      { id: 'elasticsearch', depends: [], status: 'exited' },
    ],
  },
  {
    id: 'monitoring', name: 'monitoring', file: '~/projects/observability/docker-compose.yml',
    services: ['grafana'],
    graph: [{ id: 'grafana', depends: [], status: 'running' }],
  },
];

export const IMAGES: Image[] = [
  { id: 'sha256:a3b21c', repo: 'myapp/api-gateway',     tag: '2.1.4',        size: '184 MB',  created: '2 weeks ago',  inUse: true  },
  { id: 'sha256:f8e7d6', repo: 'myapp/auth',            tag: '1.4.2',        size: '142 MB',  created: '2 weeks ago',  inUse: true  },
  { id: 'sha256:c9d8e7', repo: 'myapp/frontend',        tag: '3.2.0',        size: '298 MB',  created: '6 days ago',   inUse: true  },
  { id: 'sha256:12ab34', repo: 'myapp/worker',          tag: '0.9.1',        size: '210 MB',  created: '6 hours ago',  inUse: true  },
  { id: 'sha256:0fedcb', repo: 'nginx',                 tag: '1.25-alpine',  size: '41.2 MB', created: '3 months ago', inUse: true  },
  { id: 'sha256:5566aa', repo: 'postgres',              tag: '16.2-alpine',  size: '243 MB',  created: '1 month ago',  inUse: true  },
  { id: 'sha256:deadbe', repo: 'redis',                 tag: '7.2.4-alpine', size: '38.4 MB', created: '2 months ago', inUse: true  },
  { id: 'sha256:0badc0', repo: 'elasticsearch',         tag: '8.12.2',       size: '998 MB',  created: '3 days ago',   inUse: false },
  { id: 'sha256:feedfa', repo: 'confluentinc/cp-kafka', tag: '7.6.0',        size: '892 MB',  created: '1 month ago',  inUse: true  },
  { id: 'sha256:b16b00', repo: 'grafana/grafana',       tag: '10.3.3',       size: '412 MB',  created: '2 weeks ago',  inUse: true  },
  { id: 'sha256:771122', repo: 'ubuntu',                tag: 'latest',       size: '77.8 MB', created: '2 weeks ago',  inUse: false },
  { id: 'sha256:332244', repo: 'node',                  tag: '18-bullseye',  size: '998 MB',  created: '3 days ago',   inUse: false },
];

export const NETWORKS: Network[] = [
  { id: 'net-bridge',  name: 'bridge',         driver: 'bridge', scope: 'local', subnet: '172.17.0.0/16', containers: 0 },
  { id: 'net-host',    name: 'host',           driver: 'host',   scope: 'local', subnet: '—',             containers: 0 },
  { id: 'net-none',    name: 'none',           driver: 'none',   scope: 'local', subnet: '—',             containers: 0 },
  { id: 'net-myapp',   name: 'myapp_default',  driver: 'bridge', scope: 'local', subnet: '172.18.0.0/16', containers: 9 },
  { id: 'net-monitor', name: 'monitoring_net', driver: 'bridge', scope: 'local', subnet: '172.20.0.0/16', containers: 1 },
];

export const VOLUMES: Volume[] = [
  { id: 'vol-pg',      name: 'postgres_data',       driver: 'local', size: '1.2 GB',  inUse: true  },
  { id: 'vol-redis',   name: 'redis_data',          driver: 'local', size: '48 MB',   inUse: true  },
  { id: 'vol-es',      name: 'elasticsearch_data',  driver: 'local', size: '4.4 GB',  inUse: false },
  { id: 'vol-grafana', name: 'grafana_storage',     driver: 'local', size: '128 MB',  inUse: true  },
  { id: 'vol-kafka',   name: 'kafka_logs',          driver: 'local', size: '892 MB',  inUse: true  },
  { id: 'vol-orphan',  name: 'tmp_build_cache_a3f', driver: 'local', size: '2.1 GB',  inUse: false },
];

export const DISK_USAGE: DiskUsage = {
  images:     { count: 12, active: 9,  size: '4.6 GB',   reclaimable: '1.1 GB'  },
  containers: { count: 10, active: 8,  size: '184 MB',   reclaimable: '92 MB'   },
  volumes:    { count: 6,  active: 5,  size: '8.7 GB',   reclaimable: '2.1 GB'  },
  buildCache: { count: 84, active: 0,  size: '12.4 GB',  reclaimable: '12.4 GB' },
  total: '25.9 GB',
};

export const BUILDS: Build[] = [
  {
    id: 'b-001', image: 'myapp/api-gateway:latest', context: '~/projects/myapp/services/api-gateway',
    status: 'running', duration: '00:12', finished: 'now',
    steps: [
      { n: 1, total: 7, instruction: 'FROM',    detail: 'node:18-bullseye',        cached: true,  durationMs: 20,    duration: '0.0s',  status: 'done' },
      { n: 2, total: 7, instruction: 'WORKDIR', detail: '/app',                    cached: true,  durationMs: 10,    duration: '0.0s',  status: 'done' },
      { n: 3, total: 7, instruction: 'COPY',    detail: 'package*.json ./',         cached: true,  durationMs: 30,    duration: '0.0s',  status: 'done' },
      { n: 4, total: 7, instruction: 'RUN',     detail: 'npm ci --only=production', cached: false, cacheReason: 'package-lock.json changed', durationMs: 11200, duration: '11.2s', status: 'done', output: ['added 248 packages in 11s'] },
      { n: 5, total: 7, instruction: 'COPY',    detail: '. .',                      cached: false, cacheReason: 'src/server.js modified', durationMs: 400, duration: '0.4s', status: 'running' },
      { n: 6, total: 7, instruction: 'EXPOSE',  detail: '3000',                     cached: false, durationMs: 0,     duration: '—',     status: 'pending' },
      { n: 7, total: 7, instruction: 'CMD',     detail: '["node","server.js"]',     cached: false, durationMs: 0,     duration: '—',     status: 'pending' },
    ],
  },
  {
    id: 'b-002', image: 'myapp/frontend:3.2.0', context: '~/projects/myapp/services/frontend',
    status: 'success', duration: '00:42', finished: '6 hours ago',
    steps: [
      { n: 1, total: 5, instruction: 'FROM',   detail: 'node:18-alpine',   cached: true,  durationMs: 20,    duration: '0.0s',  status: 'done' },
      { n: 2, total: 5, instruction: 'COPY',   detail: '. .',               cached: false, cacheReason: 'src tree modified', durationMs: 1100, duration: '1.1s', status: 'done' },
      { n: 3, total: 5, instruction: 'RUN',    detail: 'npm run build',     cached: false, cacheReason: 'invalidated by previous COPY', durationMs: 38400, duration: '38.4s', status: 'done' },
      { n: 4, total: 5, instruction: 'EXPOSE', detail: '8080',              cached: true,  durationMs: 10,    duration: '0.0s',  status: 'done' },
      { n: 5, total: 5, instruction: 'CMD',    detail: '["npm","start"]',   cached: true,  durationMs: 10,    duration: '0.0s',  status: 'done' },
    ],
  },
];

export const BIND_MOUNTS: Record<string, BindMount[]> = {
  'api-gateway': [
    { host: '~/projects/myapp/services/api-gateway/src',    container: '/app/src',     mode: 'rw', changedAgo: '38 s ago', changedFiles: 3 },
    { host: '~/projects/myapp/services/api-gateway/config', container: '/app/config',  mode: 'ro', changedAgo: '4 m ago',  changedFiles: 1 },
  ],
  'frontend-app': [
    { host: '~/projects/myapp/services/frontend/src', container: '/app/src', mode: 'rw', changedAgo: '12 s ago', changedFiles: 1 },
  ],
};

export const CONTAINER_DIFF: Record<string, FileDiff[]> = {
  'api-gateway': [
    { kind: 'C', path: '/app' },
    { kind: 'A', path: '/app/node_modules/.cache' },
    { kind: 'C', path: '/var/log/app/access.log' },
    { kind: 'A', path: '/tmp/socket-3000' },
  ],
};

export const EXIT_INFO: Record<string, ExitInfo> = {
  'elasticsearch': {
    code: 137, signal: 'SIGKILL', reason: 'OOMKilled — exceeded memory limit (990 MB)',
    killedBy: 'oom', at: '2 months ago',
    tail: [
      'java.lang.RuntimeException: bootstrap checks failed',
      'max virtual memory areas vm.max_map_count [65530] is too low',
      '[o.e.b.ElasticsearchUncaughtExceptionHandler] fatal error in thread',
    ],
  },
};

export const MOCK_LOGS: Record<string, string[]> = {
  'api-gateway': [
    '10:22:58.021  INFO  [http] GET /api/v1/users 200 12ms',
    '10:22:58.234  INFO  [http] POST /api/v1/auth/refresh 200 4ms',
    '10:22:59.001  INFO  [http] GET /api/v1/products?page=2 200 34ms',
    '10:23:02.412  DEBUG [cache] miss key=user:42 fetching from db',
    '10:23:02.503  INFO  [http] GET /api/v1/users/42 200 91ms',
  ],
  'worker-queue': [
    '10:22:45.001  INFO  starting job processor (concurrency=8)',
    '10:22:53.441  WARN  queue depth: 2847 (threshold: 1000)',
    '10:22:57.884  WARN  memory: 689MB / 512MB — exceeds limit',
    '10:22:58.220  ERROR oom-killer triggered, reducing concurrency to 2',
  ],
  'postgres-main': [
    '10:22:50.001  LOG   checkpoint starting: time',
    '10:22:51.334  LOG   checkpoint complete: wrote 284 buffers',
    '10:22:55.001  LOG   connection received: host=172.18.0.4 port=42882',
    '10:23:01.772  LOG   duration: 2341ms statement: SELECT * FROM events',
  ],
  'elasticsearch': [
    '10:18:21.001  INFO  [o.e.n.Node] initializing ...',
    '10:18:22.334  WARN  [o.e.b.BootstrapChecks] vm.max_map_count too low',
    '10:18:22.991  ERROR [o.e.b.ElasticsearchUncaughtExceptionHandler] fatal error',
    '10:18:22.993  ERROR java.lang.RuntimeException: bootstrap checks failed',
    '10:18:22.994  INFO  [o.e.n.Node] stopping ...',
    '10:18:23.001  INFO  [o.e.n.Node] stopped',
  ],
};

export const IMAGE_LAYERS: Record<string, ImageLayer[]> = {
  'sha256:a3b21c': [
    { id: 'L0', instruction: 'FROM',    detail: 'node:18-bullseye',         size: '998 MB',  sizeBytes: 998000000, created: '3 days ago' },
    { id: 'L1', instruction: 'WORKDIR', detail: '/app',                      size: '0 B',     sizeBytes: 0,         created: '2 weeks ago' },
    { id: 'L2', instruction: 'COPY',    detail: 'package*.json ./',          size: '1.2 KB',  sizeBytes: 1200,      created: '2 weeks ago' },
    { id: 'L3', instruction: 'RUN',     detail: 'npm ci --only=production',  size: '142 MB',  sizeBytes: 142000000, created: '2 weeks ago' },
    { id: 'L4', instruction: 'COPY',    detail: '. .',                       size: '38 MB',   sizeBytes: 38000000,  created: '2 weeks ago' },
    { id: 'L5', instruction: 'EXPOSE',  detail: '3000',                      size: '0 B',     sizeBytes: 0,         created: '2 weeks ago' },
    { id: 'L6', instruction: 'CMD',     detail: '["node","server.js"]',      size: '0 B',     sizeBytes: 0,         created: '2 weeks ago' },
  ],
  'sha256:c9d8e7': [
    { id: 'L0', instruction: 'FROM',    detail: 'node:18-alpine',            size: '178 MB',  sizeBytes: 178000000, created: '1 month ago' },
    { id: 'L1', instruction: 'WORKDIR', detail: '/app',                      size: '0 B',     sizeBytes: 0,         created: '6 days ago' },
    { id: 'L2', instruction: 'COPY',    detail: 'package*.json ./',          size: '2.4 KB',  sizeBytes: 2400,      created: '6 days ago' },
    { id: 'L3', instruction: 'RUN',     detail: 'npm ci',                    size: '186 MB',  sizeBytes: 186000000, created: '6 days ago' },
    { id: 'L4', instruction: 'COPY',    detail: '. .',                       size: '12 MB',   sizeBytes: 12000000,  created: '6 days ago' },
    { id: 'L5', instruction: 'RUN',     detail: 'npm run build',             size: '42 MB',   sizeBytes: 42000000,  created: '6 days ago' },
    { id: 'L6', instruction: 'RUN',     detail: 'npm prune --production',    size: '0 B',     sizeBytes: 0,         created: '6 days ago' },
    { id: 'L7', instruction: 'EXPOSE',  detail: '8080',                      size: '0 B',     sizeBytes: 0,         created: '6 days ago' },
    { id: 'L8', instruction: 'CMD',     detail: '["npm","start"]',           size: '0 B',     sizeBytes: 0,         created: '6 days ago' },
  ],
  'sha256:5566aa': [
    { id: 'L0', instruction: 'FROM',   detail: 'alpine:3.19',                size: '7.8 MB',  sizeBytes: 7800000,   created: '2 months ago' },
    { id: 'L1', instruction: 'RUN',    detail: 'apk add postgresql16',       size: '82 MB',   sizeBytes: 82000000,  created: '1 month ago' },
    { id: 'L2', instruction: 'RUN',    detail: 'mkdir -p /var/lib/postgres', size: '0 B',     sizeBytes: 0,         created: '1 month ago' },
    { id: 'L3', instruction: 'COPY',   detail: 'docker-entrypoint.sh',       size: '4.2 KB',  sizeBytes: 4200,      created: '1 month ago' },
    { id: 'L4', instruction: 'VOLUME', detail: '/var/lib/postgresql/data',   size: '0 B',     sizeBytes: 0,         created: '1 month ago' },
    { id: 'L5', instruction: 'EXPOSE', detail: '5432',                       size: '0 B',     sizeBytes: 0,         created: '1 month ago' },
    { id: 'L6', instruction: 'CMD',    detail: '["postgres"]',               size: '0 B',     sizeBytes: 0,         created: '1 month ago' },
  ],
  'sha256:0badc0': [
    { id: 'L0', instruction: 'FROM',   detail: 'ubuntu:22.04',              size: '77.8 MB', sizeBytes: 77800000,  created: '3 months ago' },
    { id: 'L1', instruction: 'RUN',    detail: 'apt-get update && install java-17', size: '412 MB', sizeBytes: 412000000, created: '1 month ago' },
    { id: 'L2', instruction: 'RUN',    detail: 'groupadd elasticsearch',    size: '1.2 KB',  sizeBytes: 1200,      created: '3 days ago' },
    { id: 'L3', instruction: 'COPY',   detail: 'elasticsearch-8.12.2/',     size: '498 MB',  sizeBytes: 498000000, created: '3 days ago' },
    { id: 'L4', instruction: 'COPY',   detail: 'config/ /usr/share/elasticsearch/config', size: '8.4 KB', sizeBytes: 8400, created: '3 days ago' },
    { id: 'L5', instruction: 'EXPOSE', detail: '9200 9300',                 size: '0 B',     sizeBytes: 0,         created: '3 days ago' },
    { id: 'L6', instruction: 'CMD',    detail: '["elasticsearch"]',         size: '0 B',     sizeBytes: 0,         created: '3 days ago' },
  ],
};

export const IMAGE_USED_BY: Record<string, string[]> = (() => {
  const result: Record<string, string[]> = {};
  IMAGES.forEach((img) => {
    const full = `${img.repo}:${img.tag}`;
    result[img.id] = CONTAINERS.filter((c) => c.image === full).map((c) => c.name);
  });
  return result;
})();

export const RECENT_CMDS: RecentCmd[] = [
  { id: 'r1', cmd: 'docker run -d --name api-gateway -p 3000:3000 myapp/api-gateway:2.1.4', ranAt: '2 m ago',   exit: 0   },
  { id: 'r2', cmd: 'docker compose -f ~/projects/myapp/docker-compose.yml up -d',           ranAt: '14 m ago',  exit: 0   },
  { id: 'r3', cmd: 'docker exec -it postgres-main psql -U app production',                  ranAt: '1 h ago',   exit: 0   },
  { id: 'r4', cmd: 'docker logs -f --tail 200 worker-queue',                                ranAt: '2 h ago',   exit: 130 },
  { id: 'r5', cmd: 'docker build -t myapp/frontend:3.2.0 ~/projects/myapp/services/frontend', ranAt: '6 h ago', exit: 0   },
  { id: 'r6', cmd: 'docker network inspect myapp_default',                                  ranAt: 'yesterday', exit: 0   },
  { id: 'r7', cmd: 'docker pull elasticsearch:8.12.2',                                      ranAt: '2 d ago',   exit: 0   },
  { id: 'r8', cmd: 'docker run -d -e CONCURRENCY=8 myapp/worker:0.9.1',                    ranAt: '3 d ago',   exit: 1   },
];

export const HOST_PORTS: HostPort[] = [
  { port: 3000, pid: 41208, process: 'node (vite)' },
  { port: 5432, pid: 1093,  process: 'postgres'    },
  { port: 8080, pid: 22481, process: 'caddy'        },
  { port: 6379, pid: 1098,  process: 'redis-server' },
];

export const MOCK_COMPOSE: Record<string, string> = {
  'myapp': `version: "3.8"

services:
  nginx-proxy:
    image: nginx:1.25-alpine
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - frontend-app
      - api-gateway
    restart: unless-stopped

  frontend-app:
    build: ./services/frontend
    image: myapp/frontend:3.2.0
    ports:
      - "8080:8080"
    depends_on:
      - api-gateway
    environment:
      NODE_ENV: production
      API_URL: http://api-gateway:3000

  api-gateway:
    build: ./services/api-gateway
    image: myapp/api-gateway:2.1.4
    ports:
      - "3000:3000"
    depends_on:
      - auth-service
    environment:
      NODE_ENV: production
      LOG_LEVEL: info
      DB_HOST: postgres-main
    deploy:
      resources:
        limits:
          cpus: "1.5"
          memory: 512M

  auth-service:
    build: ./services/auth
    image: myapp/auth:1.4.2
    ports:
      - "127.0.0.1:3001:3001"
    environment:
      NODE_ENV: production
      JWT_SECRET: \${JWT_SECRET}
      SESSION_TTL: "3600"

  worker-queue:
    build: ./services/worker
    image: myapp/worker:0.9.1
    depends_on:
      - api-gateway
    environment:
      NODE_ENV: production
      CONCURRENCY: "8"`,

  'data': `version: "3.8"

services:
  postgres-main:
    image: postgres:16.2-alpine
    ports:
      - "127.0.0.1:5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: production
      POSTGRES_USER: app
      POSTGRES_PASSWORD: \${PG_PASSWORD}
    restart: unless-stopped

  redis-cache:
    image: redis:7.2.4-alpine
    ports:
      - "127.0.0.1:6379:6379"
    command: redis-server --maxmemory 256mb
    volumes:
      - redis_data:/data

  kafka-broker:
    image: confluentinc/cp-kafka:7.6.0
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1

  elasticsearch:
    image: elasticsearch:8.12.2
    ports:
      - "9200:9200"
    environment:
      discovery.type: single-node
    deploy:
      resources:
        limits:
          memory: 990M

volumes:
  postgres_data:
  redis_data:
  elasticsearch_data:
  kafka_logs:`,

  'monitoring': `version: "3.8"

services:
  grafana:
    image: grafana/grafana:10.3.3
    ports:
      - "3001:3000"
    volumes:
      - grafana_storage:/var/lib/grafana
    environment:
      GF_SECURITY_ADMIN_PASSWORD: \${GRAFANA_PASSWORD}

volumes:
  grafana_storage:`,
};
