import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import type { Image } from '../types/docker';

export function useImages() {
  return useQuery<Image[]>({
    queryKey: ['images'],
    queryFn: api.images.list,
    refetchInterval: 30000,
  });
}
