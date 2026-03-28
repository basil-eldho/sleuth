import type { Container, Image, Network, Volume, Stack, DiskUsage } from '../types/docker';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, options);
  if (!res.ok) {
    const msg = await res.text().catch(() => 'unknown error');
    throw new Error(`${res.status}: ${msg}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export interface ExecResult { stdout: string; stderr: string; }

export const api = {
  containers: {
    list:    ()          => request<Container[]>('/containers'),
    get:     (id: string) => request<Container>(`/containers/${id}`),
    start:   (id: string) => request<void>(`/containers/${id}/start`,   { method: 'POST' }),
    stop:    (id: string) => request<void>(`/containers/${id}/stop`,    { method: 'POST' }),
    restart: (id: string) => request<void>(`/containers/${id}/restart`, { method: 'POST' }),
    remove:  (id: string) => request<void>(`/containers/${id}`,         { method: 'DELETE' }),
    exec:    (id: string, cmd: string, shell: string) =>
      request<ExecResult>(`/containers/${id}/exec`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cmd, shell }),
      }),
  },
  images:   { list: () => request<Image[]>('/images') },
  networks: { list: () => request<Network[]>('/networks') },
  volumes:  { list: () => request<Volume[]>('/volumes') },
  stacks:   { list: () => request<Stack[]>('/stacks') },
  system: {
    df:    () => request<DiskUsage>('/system/df'),
    prune: (targets: string[]) => request<{ spaceReclaimed: string }>('/system/prune', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targets }),
    }),
  },
};
