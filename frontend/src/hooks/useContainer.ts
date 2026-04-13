import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import type { Container } from '../types/docker';

export function useContainer(id: string | null) {
  return useQuery<Container>({
    queryKey: ['container', id],
    queryFn: () => api.containers.get(id!),
    enabled: id !== null,
    refetchInterval: 3000,
  });
}
