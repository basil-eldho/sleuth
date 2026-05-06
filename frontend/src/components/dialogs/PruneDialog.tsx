import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal, ModalHeader } from '../ui/Modal';
import { DetailBtn } from '../ui/TopBtn';
import { useDiskUsage } from '../../hooks/useDiskUsage';
import { api } from '../../api/client';
import type { DiskSection } from '../../types/docker';

interface PruneRowProps {
  label: string;
  data: DiskSection;
  warn: boolean;
  selected: boolean;
  onToggle: () => void;
}

function PruneRow({ label, data, warn, selected, onToggle }: PruneRowProps) {
  return (
    <div
      onClick={onToggle}
      className={[
        'flex items-center gap-3 px-3 py-2.5 rounded-sm mb-1 cursor-pointer border transition-colors',
        selected ? 'bg-active border-green-border' : 'bg-card border-border1',
      ].join(' ')}
    >
      <span className={selected ? 'text-green' : 'text-fg5'}>{selected ? '☒' : '☐'}</span>
      <div className="flex-1">
        <div className="text-base text-fg">{label}</div>
        <div className="text-xs text-fg4">
          {data.count} total · {data.active} in use · {data.size}
          {warn && <span className="text-amber ml-2">⚠ data loss possible</span>}
        </div>
      </div>
      <div className="text-right">
        <div className={`text-sm ${selected ? 'text-green' : 'text-fg3'}`}>−{data.reclaimable}</div>
        <div className="text-2xs text-fg5">reclaimable</div>
      </div>
    </div>
  );
}

interface PruneDialogProps {
  onClose: () => void;
}

const EMPTY_SECTION: DiskSection = { count: 0, active: 0, size: '—', reclaimable: '0 B' };

export function PruneDialog({ onClose }: PruneDialogProps) {
  const [picked, setPicked] = useState<Set<string>>(new Set(['images', 'build cache']));
  const { data: diskUsage } = useDiskUsage();
  const queryClient = useQueryClient();

  const prune = useMutation({
    mutationFn: () => api.system.prune([...picked]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system', 'df'] });
      queryClient.invalidateQueries({ queryKey: ['containers'] });
      queryClient.invalidateQueries({ queryKey: ['images'] });
      queryClient.invalidateQueries({ queryKey: ['volumes'] });
      onClose();
    },
  });

  function toggle(k: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  }

  const rows: Array<{ k: string; data: DiskSection; warn: boolean }> = [
    { k: 'images',      data: diskUsage?.images     ?? EMPTY_SECTION, warn: false },
    { k: 'containers',  data: diskUsage?.containers ?? EMPTY_SECTION, warn: false },
    { k: 'volumes',     data: diskUsage?.volumes    ?? EMPTY_SECTION, warn: true  },
    { k: 'build cache', data: diskUsage?.buildCache ?? EMPTY_SECTION, warn: false },
  ];

  return (
    <Modal onClose={onClose} size="md">
      <ModalHeader command="docker system prune" />
      <div className="px-4 py-3.5 overflow-auto">
        {prune.isError && (
          <div className="text-sm text-red mb-3">
            {(prune.error as Error).message}
          </div>
        )}
        <div className="text-sm text-fg2 mb-3">select what to reclaim:</div>
        {rows.map((r) => (
          <PruneRow
            key={r.k}
            label={r.k}
            data={r.data}
            warn={r.warn}
            selected={picked.has(r.k)}
            onToggle={() => !prune.isPending && toggle(r.k)}
          />
        ))}
      </div>
      <div className="flex justify-end gap-1.5 px-4 py-2.5 border-t border-border1 bg-panel shrink-0">
        <DetailBtn onClick={onClose} disabled={prune.isPending}>cancel</DetailBtn>
        <DetailBtn
          danger
          disabled={picked.size === 0 || prune.isPending}
          onClick={() => prune.mutate()}
        >
          {prune.isPending
            ? '⌫ pruning...'
            : `⌫ reclaim ${picked.size} item${picked.size === 1 ? '' : 's'}`}
        </DetailBtn>
      </div>
    </Modal>
  );
}
