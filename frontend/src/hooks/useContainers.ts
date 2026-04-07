import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import type { Container } from '../types/docker';

export function useContainers() {
  return useQuery<Container[]>({
    queryKey: ['containers'],
    queryFn: api.containers.list,
    refetchInterval: 5000,
  });
}
