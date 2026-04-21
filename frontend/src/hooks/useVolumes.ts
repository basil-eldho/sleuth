import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import type { Volume } from '../types/docker';

export function useVolumes() {
  return useQuery<Volume[]>({
    queryKey: ['volumes'],
    queryFn: api.volumes.list,
    refetchInterval: 15000,
  });
}
