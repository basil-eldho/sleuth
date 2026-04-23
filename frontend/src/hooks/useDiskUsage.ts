import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import type { DiskUsage } from '../types/docker';

export function useDiskUsage() {
  return useQuery<DiskUsage>({
    queryKey: ['system', 'df'],
    queryFn: api.system.df,
    refetchInterval: 30000,
  });
}
