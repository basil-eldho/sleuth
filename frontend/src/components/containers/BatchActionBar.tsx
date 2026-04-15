import { useAppStore } from '../../store';
import { useContainers } from '../../hooks/useContainers';
import { useBatchContainerActions } from '../../hooks/useContainerActions';

function BatchBtn({
  label,
  colorClass,
  dangerHover = false,
  onClick,
}: {
  label: string;
  colorClass: string;
  dangerHover?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'border border-border3 rounded-sm px-2.5 py-1 text-xs cursor-pointer font-mono',
        'bg-transparent text-fg3 transition-colors whitespace-nowrap',
        dangerHover
          ? 'hover:border-danger-border hover:text-red hover:bg-red/5'
          : `hover:border-border1 hover:bg-white/[0.04] hover:${colorClass}`,
      ].join(' ')}
    >
      {label}
    </button>
  );
}

export function BatchActionBar() {
  const batchSelected = useAppStore((s) => s.batchSelected);
  const clearBatch    = useAppStore((s) => s.clearBatch);
  const { data: containers = [] } = useContainers();
  const batch = useBatchContainerActions();

  const count = batchSelected.size;
  if (count === 0) return null;

  const selected     = containers.filter((c) => batchSelected.has(c.id));
  const runningIds   = selected.filter((c) => c.status === 'running' || c.status === 'warning').map((c) => c.id);
  const stoppedIds   = selected.filter((c) => c.status === 'exited').map((c) => c.id);
  const allIds       = selected.map((c) => c.id);

  function run(fn: () => void) {
    fn();
    clearBatch();
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50
      flex items-center gap-3 px-4 py-2
      bg-panel border border-border2 rounded-md
      shadow-[0_8px_32px_rgba(0,0,0,0.5)] font-mono whitespace-nowrap">

      <span className="text-base text-green font-medium">{count}</span>
      <span className="text-sm text-fg3">selected</span>

      <span className="w-px h-4 bg-border2" />

      {runningIds.length > 0 && (
        <>
          <BatchBtn
            label={`■ stop ${runningIds.length}`}
            colorClass="text-red"
            dangerHover
            onClick={() => run(() => batch.stopAll.mutate(runningIds))}
          />
          <BatchBtn
            label={`↺ restart ${runningIds.length}`}
            colorClass="text-fg3"
            onClick={() => run(() => batch.restartAll.mutate(runningIds))}
          />
        </>
      )}
      {stoppedIds.length > 0 && (
        <BatchBtn
          label={`▶ start ${stoppedIds.length}`}
          colorClass="text-green"
          onClick={() => run(() => batch.startAll.mutate(stoppedIds))}
        />
      )}
      <BatchBtn
        label={`✕ remove ${count}`}
        colorClass="text-red"
        dangerHover
        onClick={() => run(() => batch.removeAll.mutate(allIds))}
      />

      <span className="w-px h-4 bg-border2" />

      <BatchBtn label="deselect all" colorClass="text-fg4" onClick={clearBatch} />
    </div>
  );
}
