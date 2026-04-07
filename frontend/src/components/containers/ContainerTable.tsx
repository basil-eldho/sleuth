import { memo, useState, useCallback } from 'react';
import { useAppStore } from '../../store';
import { StatusDot } from '../ui/Dot';
import { CheckBox } from '../ui/CheckBox';
import { ActionIcon } from '../ui/TopBtn';
import { MiniBar } from '../ui/MiniBar';
import { PortLink } from '../ui/PortLink';
import type { Container, ContainerStatus } from '../../types/docker';

const statusTextClass: Record<ContainerStatus, string> = {
  running: 'text-green',
  warning: 'text-amber',
  exited:  'text-red',
};

const statusBorderClass: Record<ContainerStatus, string> = {
  running: 'border-l-green',
  warning: 'border-l-amber',
  exited:  'border-l-red',
};

const STATUS_LABEL: Record<ContainerStatus, string> = {
  running: 'Running',
  warning: 'Running',
  exited:  'Exited',
};

interface ContainerRowProps {
  container: Container;
  selected: boolean;
  hovered: boolean;
  batchChecked: boolean;
  density: 'compact' | 'comfortable';
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  onBatchToggle: (id: string) => void;
}

const ContainerRow = memo(function ContainerRow({
  container: c,
  selected,
  hovered,
  batchChecked,
  density,
  onSelect,
  onHover,
  onBatchToggle,
}: ContainerRowProps) {
  const cellPy    = density === 'compact' ? 'py-1' : 'py-cell';
  const isExited  = c.status === 'exited';
  const cpuHigh   = c.cpu > 70;
  const hasLimit  = c.memLimit > 0;
  const memPct    = hasLimit ? c.mem / c.memLimit : 0;
  const memHigh   = hasLimit && memPct > 1.0;
  const memWarn   = hasLimit && memPct > 0.8;

  return (
    <tr
      onClick={() => onSelect(c.id)}
      onMouseEnter={() => onHover(c.id)}
      onMouseLeave={() => onHover(null)}
      className={[
        'cursor-pointer border-b border-active border-l-2 transition-colors',
        selected ? 'bg-active' : hovered ? 'bg-hover' : 'bg-transparent',
        selected || hovered ? statusBorderClass[c.status] : 'border-l-transparent',
      ].join(' ')}
    >
      <td className="pl-2.5 py-1 w-9">
        <CheckBox checked={batchChecked} onChange={() => onBatchToggle(c.id)} />
      </td>

      <td className={`${density === 'compact' ? 'py-1' : 'py-cell'} pr-3 pl-1`}>
        <span className="flex items-center gap-1.5">
          <StatusDot status={c.status} />
          <span className={`text-sm ${statusTextClass[c.status]}`}>
            {STATUS_LABEL[c.status]}
          </span>
        </span>
      </td>

      <td className={`${cellPy} px-3`}>
        <span className="text-base text-fg font-medium">{c.name}</span>
      </td>

      <td className={`${cellPy} px-3 overflow-hidden`}>
        <span className="text-sm text-fg3 block truncate">{c.image}</span>
      </td>

      <td className={`${cellPy} px-3`}>
        {isExited ? (
          <span className="text-sm text-fg6">—</span>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className={`text-sm min-w-[34px] text-right ${cpuHigh ? 'text-amber' : 'text-fg3'}`}>
              {c.cpu.toFixed(1)}%
            </span>
            <MiniBar value={c.cpu} max={100} colorClass={cpuHigh ? 'bg-amber' : 'bg-border3'} />
          </div>
        )}
      </td>

      <td className={`${cellPy} px-3`}>
        {isExited ? (
          <span className="text-sm text-fg6">—</span>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className={`text-sm min-w-[52px] text-right ${memHigh ? 'text-red' : 'text-fg3'}`}>
              {c.mem.toFixed(1)}{hasLimit ? `/${c.memLimit.toFixed(0)}` : ''} MB
            </span>
            <MiniBar
              value={hasLimit ? c.mem : 0}
              max={hasLimit ? c.memLimit : 1}
              colorClass={memHigh ? 'bg-red' : memWarn ? 'bg-amber' : 'bg-border3'}
            />
          </div>
        )}
      </td>

      <td className={`${cellPy} px-3 overflow-hidden`}>
        {(() => {
          const parts = c.ports ? c.ports.split(',').map((p) => p.trim()) : [];
          const shown = parts.slice(0, 2).join(', ') || null;
          const extra = parts.length - 2;
          return (
            <span className="flex items-center gap-1 min-w-0">
              <PortLink ports={shown} />
              {extra > 0 && (
                <span className="text-2xs text-fg5 shrink-0">+{extra}</span>
              )}
            </span>
          );
        })()}
      </td>

      <td className={`${cellPy} px-3`}>
        <span className="text-sm text-fg3">
          {c.uptime ?? <span className="text-fg5">—</span>}
        </span>
      </td>

      <td className={`${density === 'compact' ? 'py-1' : 'py-cell'} px-2`}>
        <div className={`flex justify-end transition-opacity duration-100 ${selected || hovered ? 'opacity-100' : 'opacity-0'}`}>
          {isExited ? (
            <ActionIcon title="Start">▶</ActionIcon>
          ) : (
            <>
              <ActionIcon title="Stop">■</ActionIcon>
              <ActionIcon title="Restart">↺</ActionIcon>
            </>
          )}
          <ActionIcon title="Remove" danger>✕</ActionIcon>
        </div>
      </td>
    </tr>
  );
});

const TH = 'px-3 py-2 text-left text-2xs tracking-widest text-fg4 font-medium bg-bg sticky top-0 z-[1] border-b border-border2';

interface ContainerTableProps {
  containers: Container[];
}

export function ContainerTable({ containers }: ContainerTableProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const selectedId      = useAppStore((s) => s.selectedContainerId);
  const selectContainer = useAppStore((s) => s.selectContainer);
  const batchSelected   = useAppStore((s) => s.batchSelected);
  const toggleBatch     = useAppStore((s) => s.toggleBatch);
  const clearBatch      = useAppStore((s) => s.clearBatch);
  const density         = useAppStore((s) => s.tweaks.density);

  const allChecked = batchSelected.size === containers.length && containers.length > 0;

  const toggleAll = useCallback(() => {
    if (allChecked) {
      clearBatch();
    } else {
      containers.forEach((c) => {
        if (!batchSelected.has(c.id)) toggleBatch(c.id);
      });
    }
  }, [allChecked, clearBatch, containers, batchSelected, toggleBatch]);

  const handleHover = useCallback((id: string | null) => setHoveredId(id), []);

  return (
    <div className="flex-1 overflow-auto font-mono">
      <table className="w-full border-collapse table-fixed min-w-[1100px]">
        <thead>
          <tr>
            <th className={`${TH} w-9 pl-2.5 pr-0`}>
              <CheckBox checked={allChecked} onChange={toggleAll} />
            </th>
            <th className={`${TH} w-[92px] pl-1`}>STATUS</th>
            <th className={`${TH} w-[170px]`}>CONTAINER</th>
            <th className={`${TH} w-[220px]`}>IMAGE</th>
            <th className={`${TH} w-[110px]`}>CPU</th>
            <th className={`${TH} w-[124px]`}>MEM</th>
            <th className={`${TH} w-[188px]`}>PORTS</th>
            <th className={`${TH} w-[100px]`}>UPTIME</th>
            <th className={`${TH} w-[80px]`} />
          </tr>
        </thead>
        <tbody>
          {containers.map((c) => (
            <ContainerRow
              key={c.id}
              container={c}
              selected={selectedId === c.id}
              hovered={hoveredId === c.id}
              batchChecked={batchSelected.has(c.id)}
              density={density}
              onSelect={selectContainer}
              onHover={handleHover}
              onBatchToggle={toggleBatch}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
