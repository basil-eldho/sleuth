import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, AlertTriangle, Check, Loader2 } from 'lucide-react';
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
        selected ? 'bg-active border-accent-border' : 'bg-card border-border1 hover:border-border3',
      ].join(' ')}
    >
      <span
        className={[
          'grid place-items-center w-4 h-4 rounded-sm border shrink-0 transition-colors',
          selected ? 'bg-accent-dim border-accent-border text-accent' : 'border-border3 text-transparent',
        ].join(' ')}
      >
        <Check size={11} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-base text-fg font-sans">{label}</div>
        <div className="text-xs text-fg4 font-mono">
          {data.count} total · {data.active} in use · {data.size}
          {warn && (
            <span className="text-amber ml-2 inline-flex items-center gap-1 font-sans">
              <AlertTriangle size={11} /> data loss possible
            </span>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className={`text-sm font-mono tabular-nums ${selected ? 'text-accent' : 'text-fg3'}`}>−{data.reclaimable}</div>
        <div className="text-2xs text-fg5 font-sans">reclaimable</div>
      </div>
    </div>
  );
}

interface PruneDialogProps {
  onClose: () => void;
}

const EMPTY_SECTION: DiskSection = { count: 0, active: 0, size: '—', reclaimable: '0 B' };

export function PruneDialog({ onClose }: PruneDialogProps) {
  const [picked, setPicked] = useState<Set<string>>(new Set(['build cache']));
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

  const pending = prune.isPending;

  return (
    <Modal onClose={onClose} size="md">
      <ModalHeader
        title="Reclaim disk space"
        icon={<Trash2 size={14} className="text-fg4" />}
        onClose={onClose}
      />
      <div className="px-4 py-3.5 overflow-auto">
        {prune.isError && (
          <div className="text-sm text-red mb-3 font-mono">{(prune.error as Error).message}</div>
        )}
        <div className="text-sm text-fg3 mb-3 font-sans">Select what to reclaim</div>
        {rows.map((r) => (
          <PruneRow
            key={r.k}
            label={r.k}
            data={r.data}
            warn={r.warn}
            selected={picked.has(r.k)}
            onToggle={() => !pending && toggle(r.k)}
          />
        ))}
        {pending && (
          <div className="flex items-center gap-2 mt-3 text-xs text-fg4 font-sans">
            <Loader2 size={13} className="animate-spin text-accent" />
            Reclaiming space… this can take a while for large images. You can close this — it keeps running.
          </div>
        )}
      </div>
      <div className="flex justify-end gap-1.5 px-4 py-2.5 border-t border-border1 bg-panel shrink-0">
        {/* Always dismissable — never trap the user behind a long-running prune. */}
        <DetailBtn onClick={onClose}>{pending ? 'close' : 'cancel'}</DetailBtn>
        <DetailBtn danger disabled={picked.size === 0 || pending} onClick={() => prune.mutate()}>
          <span className="inline-flex items-center gap-1.5">
            {pending ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
            {pending ? 'pruning…' : `reclaim ${picked.size} item${picked.size === 1 ? '' : 's'}`}
          </span>
        </DetailBtn>
      </div>
    </Modal>
  );
}
