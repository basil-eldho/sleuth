import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import type { Stack } from '../types/docker';

export function useStacks() {
  return useQuery<Stack[]>({
    queryKey: ['stacks'],
    queryFn: api.stacks.list,
    refetchInterval: 10000,
  });
}
