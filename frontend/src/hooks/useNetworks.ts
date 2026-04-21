import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import type { Network } from '../types/docker';

export function useNetworks() {
  return useQuery<Network[]>({
    queryKey: ['networks'],
    queryFn: api.networks.list,
    refetchInterval: 15000,
  });
}
