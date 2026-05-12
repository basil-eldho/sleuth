import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

export function useContainerActions(id: string) {
  const qc = useQueryClient();

  function invalidate() {
    qc.invalidateQueries({ queryKey: ['containers'] });
    qc.invalidateQueries({ queryKey: ['container', id] });
  }

  const start   = useMutation({ mutationFn: () => api.containers.start(id),   onSuccess: invalidate });
  const stop    = useMutation({ mutationFn: () => api.containers.stop(id),    onSuccess: invalidate });
  const restart = useMutation({ mutationFn: () => api.containers.restart(id), onSuccess: invalidate });
  const remove  = useMutation({ mutationFn: () => api.containers.remove(id),  onSuccess: invalidate });

  const busy = start.isPending || stop.isPending || restart.isPending || remove.isPending;

  return { start, stop, restart, remove, busy };
}

export function useBatchContainerActions() {
  const qc = useQueryClient();

  function invalidate() {
    qc.invalidateQueries({ queryKey: ['containers'] });
  }

  const stopAll = useMutation({
    mutationFn: (ids: string[]) => Promise.allSettled(ids.map(api.containers.stop)),
    onSuccess: invalidate,
  });

  const startAll = useMutation({
    mutationFn: (ids: string[]) => Promise.allSettled(ids.map(api.containers.start)),
    onSuccess: invalidate,
  });

  const restartAll = useMutation({
    mutationFn: (ids: string[]) => Promise.allSettled(ids.map(api.containers.restart)),
    onSuccess: invalidate,
  });

  const removeAll = useMutation({
    mutationFn: (ids: string[]) => Promise.allSettled(ids.map(api.containers.remove)),
    onSuccess: invalidate,
  });

  const busy = stopAll.isPending || startAll.isPending || restartAll.isPending || removeAll.isPending;

  return { stopAll, startAll, restartAll, removeAll, busy };
}
