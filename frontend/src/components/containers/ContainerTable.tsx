import { memo, useState, useCallback, useMemo } from 'react';
import { ChevronDown, Play, RotateCw, Square, Trash2 } from 'lucide-react';
import { useAppStore } from '../../store';
import { Dot, type DotColor } from '../ui/Dot';
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

const spineClass: Record<ContainerStatus, string> = {
  running: 'bg-green',
  warning: 'bg-amber',
  exited:  'bg-red',
};

const aggBgClass: Record<'green' | 'amber' | 'red', string> = {
  green: 'bg-green', amber: 'bg-amber', red: 'bg-red',
};

function stateText(c: Container): string {
  if (c.status === 'exited') return `exited${c.exitInfo ? ` (${c.exitInfo.code})` : ''}`;
  if (c.status === 'warning') return 'unhealthy';
  return 'running';
}

function Chevron({ open }: { open: boolean }) {
  return (
    <ChevronDown
      size={14}
      strokeWidth={2}
      aria-hidden="true"
      className={`text-fg5 transition-transform duration-100 ${open ? '' : '-rotate-90'}`}
    />
  );
}

interface GaugeProps {
  label: string;
  value: string;
  bar: number;
  max: number;
  hot: boolean;
}

function Gauge({ label, value, bar, max, hot }: GaugeProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-sans text-2xs tracking-section uppercase text-fg5 font-semibold w-6">{label}</span>
      <MiniBar value={bar} max={max} colorClass={hot ? 'bg-amber' : 'bg-border3'} />
      <span className={`text-xs tabular-nums w-[58px] text-right ${hot ? 'text-amber' : 'text-fg2'}`}>{value}</span>
    </div>
  );
}

interface ContainerLaneProps {
  container: Container;
  selected: boolean;
  hovered: boolean;
  batchChecked: boolean;
  showCheck: boolean;
  density: 'compact' | 'comfortable';
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  onBatchToggle: (id: string) => void;
}

const ContainerLane = memo(function ContainerLane({
  container: c,
  selected,
  hovered,
  batchChecked,
  showCheck,
  density,
  onSelect,
  onHover,
  onBatchToggle,
}: ContainerLaneProps) {
  const isExited = c.status === 'exited';
  const hasLimit = c.memLimit > 0;
  const memPct   = hasLimit ? c.mem / c.memLimit : 0;
  const cpuHot   = c.cpu > 70;
  const memHot   = hasLimit && memPct > 0.8;

  const memValue = hasLimit
    ? `${c.mem.toFixed(0)}/${c.memLimit.toFixed(0)}`
    : `${c.mem.toFixed(0)}`;

  return (
    <div
      onClick={() => onSelect(c.id)}
      onMouseEnter={() => onHover(c.id)}
      onMouseLeave={() => onHover(null)}
      className={[
        'relative flex items-center gap-4 pl-[34px] pr-4 border-b border-border1 cursor-pointer transition-colors',
        density === 'compact' ? 'py-1.5' : 'py-2.5',
        selected ? 'bg-active' : hovered ? 'bg-hover' : 'bg-transparent',
      ].join(' ')}
    >
      {/* status spine + bus tick */}
      <span className={`absolute left-0 inset-y-0 w-[3px] ${spineClass[c.status]} ${isExited ? 'opacity-60' : ''}`} aria-hidden="true" />
      <span className="absolute left-[19px] top-1/2 w-2.5 h-px bg-border2" aria-hidden="true" />

      <span className="w-5 shrink-0 flex justify-center">
        {showCheck && <CheckBox checked={batchChecked} onChange={() => onBatchToggle(c.id)} />}
      </span>

      {/* identity */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2.5">
          <span className="font-sans font-semibold text-base text-fg truncate">{c.name}</span>
          <span className={`font-sans text-2xs tracking-label shrink-0 ${statusTextClass[c.status]}`}>
            {stateText(c)}
          </span>
        </div>
        <div className="flex items-center gap-2.5 mt-0.5 min-w-0">
          <span className="text-xs text-fg4 truncate">{c.image}</span>
          {c.ports && <PortLink ports={c.ports} />}
        </div>
      </div>

      {/* telemetry */}
      {isExited ? (
        <span className="text-xs text-fg5 italic shrink-0 font-sans">idle</span>
      ) : (
        <div className="hidden lg:flex items-center gap-5 shrink-0">
          <Gauge label="CPU" value={`${c.cpu.toFixed(0)}%`} bar={c.cpu} max={100} hot={cpuHot} />
          <Gauge label="MEM" value={memValue} bar={hasLimit ? c.mem : 0} max={hasLimit ? c.memLimit : 1} hot={memHot} />
        </div>
      )}

      {/* uptime + actions */}
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-xs text-fg4 tabular-nums w-[56px] text-right">{c.uptime ?? '—'}</span>
        <div className={`flex transition-opacity duration-100 ${selected || hovered ? 'opacity-100' : 'opacity-0'}`}>
          {isExited ? (
            <ActionIcon title="Start"><Play size={13} /></ActionIcon>
          ) : (
            <>
              <ActionIcon title="Restart"><RotateCw size={13} /></ActionIcon>
              <ActionIcon title="Stop"><Square size={13} /></ActionIcon>
            </>
          )}
          <ActionIcon title="Remove" danger><Trash2 size={13} /></ActionIcon>
        </div>
      </div>
    </div>
  );
});

interface Group {
  key: string;
  name: string;
  kind: string;
  rows: Container[];
}

function groupByStack(containers: Container[]): Group[] {
  const STANDALONE = '\u0000standalone';
  const map = new Map<string, Container[]>();
  for (const c of containers) {
    const k = c.stack ?? STANDALONE;
    (map.get(k) ?? map.set(k, []).get(k)!).push(c);
  }
  const groups: Group[] = [];
  for (const [k, rows] of map) {
    if (k === STANDALONE) continue;
    groups.push({ key: k, name: k, kind: 'compose', rows });
  }
  const loose = map.get(STANDALONE);
  if (loose) groups.push({ key: 'standalone', name: 'standalone', kind: 'unmanaged', rows: loose });
  return groups;
}

function aggregate(rows: Container[]): { up: number; total: number; color: 'green' | 'amber' | 'red' } {
  const up = rows.filter((r) => r.status !== 'exited').length;
  const total = rows.length;
  const color = up === total ? 'green' : up === 0 ? 'red' : 'amber';
  return { up, total, color };
}

interface ContainerTableProps {
  containers: Container[];
}

export function ContainerTable({ containers }: ContainerTableProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const selectedId      = useAppStore((s) => s.selectedContainerId);
  const selectContainer = useAppStore((s) => s.selectContainer);
  const batchSelected   = useAppStore((s) => s.batchSelected);
  const toggleBatch     = useAppStore((s) => s.toggleBatch);
  const clearBatch      = useAppStore((s) => s.clearBatch);
  const density         = useAppStore((s) => s.tweaks.density);

  const groups     = useMemo(() => groupByStack(containers), [containers]);
  const allChecked = batchSelected.size === containers.length && containers.length > 0;
  const anyChecked = batchSelected.size > 0;

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
  const toggleCollapse = useCallback((key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  return (
    <div className="flex-1 overflow-auto font-mono">
      {/* select-all + summary */}
      <div className="flex items-center gap-2.5 pl-[34px] pr-4 py-1.5 border-b border-border1 bg-bg sticky top-0 z-[2]">
        <span className="w-5 shrink-0 flex justify-center">
          <CheckBox checked={allChecked} onChange={toggleAll} />
        </span>
        <span className="font-sans text-2xs tracking-section uppercase text-fg5 font-semibold tabular-nums">
          {containers.length} containers · {groups.length} {groups.length === 1 ? 'stack' : 'stacks'}
        </span>
      </div>

      {groups.map((g) => {
        const a = aggregate(g.rows);
        const open = !collapsed.has(g.key);
        return (
          <div key={g.key}>
            <button
              onClick={() => toggleCollapse(g.key)}
              className="w-full flex items-center gap-2.5 px-4 py-2 bg-panel border-b border-border1 font-sans text-left sticky top-[29px] z-[1]"
            >
              <Chevron open={open} />
              <span className={`w-2 h-2 rounded-sm shrink-0 ${aggBgClass[a.color]} ${a.color === 'red' ? 'opacity-70' : ''}`} />
              <span className="text-xs font-semibold tracking-label text-fg2">{g.name}</span>
              <span className="text-2xs text-fg5">{g.kind}</span>
              <span className="ml-auto flex items-center gap-1.5 text-2xs text-fg4 tabular-nums">
                <Dot color={a.color as DotColor} />
                {a.up}/{a.total}
              </span>
            </button>

            {open && (
              <div className="relative">
                <div className="absolute left-[19px] top-0 bottom-2 w-px bg-border1" aria-hidden="true" />
                {g.rows.map((c) => (
                  <ContainerLane
                    key={c.id}
                    container={c}
                    selected={selectedId === c.id}
                    hovered={hoveredId === c.id}
                    batchChecked={batchSelected.has(c.id)}
                    showCheck={hoveredId === c.id || selectedId === c.id || batchSelected.has(c.id) || anyChecked}
                    density={density}
                    onSelect={selectContainer}
                    onHover={handleHover}
                    onBatchToggle={toggleBatch}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
