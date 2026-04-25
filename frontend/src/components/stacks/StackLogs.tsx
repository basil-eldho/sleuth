import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useContainers } from '../../hooks/useContainers';
import { useLogs } from '../../hooks/useLogs';
import type { Stack, Container } from '../../types/docker';

const SERVICE_COLORS = [
  'var(--color-blue)',
  'var(--color-warm)',
  'var(--color-green)',
  'var(--color-fg2)',
  'var(--color-amber)',
  'var(--color-red)',
];

interface LogEntry {
  container: string;
  status: Container['status'];
  line: string;
  color: string;
}

interface ServiceLogStreamProps {
  container: Container;
  color: string;
  onUpdate: (id: string, entries: LogEntry[]) => void;
}

function ServiceLogStream({ container, color, onUpdate }: ServiceLogStreamProps) {
  const lines = useLogs(container.id);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    onUpdateRef.current(container.id, lines.map((line) => ({
      container: container.name,
      status: container.status,
      line,
      color,
    })));
  }, [lines, container.id, container.name, container.status, color]);

  return null;
}

interface StackLogsProps {
  stack: Stack;
  onClose: () => void;
}

export function StackLogs({ stack, onClose }: StackLogsProps) {
  const { data: allContainers = [] } = useContainers();
  const members = useMemo(
    () => allContainers.filter((c) => c.stack === stack.id),
    [allContainers, stack.id],
  );

  const colorMap = useMemo(() => {
    const m: Record<string, string> = {};
    members.forEach((c, i) => { m[c.id] = SERVICE_COLORS[i % SERVICE_COLORS.length]; });
    return m;
  }, [members]);

  const [logsByContainer, setLogsByContainer] = useState<Record<string, LogEntry[]>>({});

  const handleUpdate = useCallback((id: string, entries: LogEntry[]) => {
    setLogsByContainer((prev) => ({ ...prev, [id]: entries }));
  }, []);

  const allLines = useMemo<LogEntry[]>(() => {
    const lines = Object.values(logsByContainer).flat();
    lines.sort((a, b) => {
      const ta = a.line.match(/^(\S+)/)?.[1] ?? '';
      const tb = b.line.match(/^(\S+)/)?.[1] ?? '';
      return ta.localeCompare(tb);
    });
    return lines;
  }, [logsByContainer]);

  const [filter, setFilter] = useState('');
  const [follow, setFollow] = useState(true);
  const [muted, setMuted]   = useState<Set<string>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (follow) bottomRef.current?.scrollIntoView();
  }, [follow, allLines]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function toggleMute(name: string) {
    setMuted((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }

  const visible = allLines.filter((entry) => {
    if (muted.has(entry.container)) return false;
    if (filter && !entry.line.toLowerCase().includes(filter.toLowerCase()) &&
        !entry.container.includes(filter.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex-1 flex flex-col bg-bg overflow-hidden">
      {members.map((m) => (
        <ServiceLogStream
          key={m.id}
          container={m}
          color={colorMap[m.id]}
          onUpdate={handleUpdate}
        />
      ))}

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border1 bg-card shrink-0">
        <div className="flex items-center gap-2.5 whitespace-nowrap">
          <button
            onClick={onClose}
            className="bg-transparent border-none cursor-pointer text-fg4 text-xs px-0 hover:text-fg2 transition-colors"
          >
            ← stacks
          </button>
          <span className="text-fg6 text-xs">/</span>
          <span className="text-sm text-fg">{stack.name}</span>
          <span className="text-xs text-fg4">compose logs · {members.length} services</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-fg5">
            <span className="text-green">$</span> docker compose -f {stack.file} logs -f --tail 100
          </span>
          <span className="text-2xs text-fg5 ml-2">esc to close</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2.5 px-4 py-2 border-b border-border1 bg-panel shrink-0 flex-wrap">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="grep..."
          className="bg-input border border-border3 rounded-sm px-2 py-0.5 text-fg2 text-sm outline-none w-[160px]"
        />
        <div className="flex gap-1 flex-wrap">
          {members.map((m) => {
            const active = !muted.has(m.name);
            return (
              <button
                key={m.id}
                onClick={() => toggleMute(m.name)}
                className="bg-transparent rounded-sm px-1.5 py-0.5 text-2xs cursor-pointer tracking-port flex items-center gap-1 whitespace-nowrap border transition-colors"
                style={{
                  borderColor: active ? colorMap[m.id] + '44' : 'var(--color-border1)',
                  color: active ? colorMap[m.id] : 'var(--color-fg6)',
                }}
              >
                <span
                  className="w-1 h-1 rounded-full inline-block shrink-0"
                  style={{ background: active ? colorMap[m.id] : 'var(--color-fg6)' }}
                />
                {m.name}
              </button>
            );
          })}
        </div>
        <span className="flex-1" />
        <span className="text-xs text-fg5">{visible.length} / {allLines.length} lines</span>
        <button
          onClick={() => setFollow((f) => !f)}
          className={[
            'bg-transparent rounded-sm px-2 py-0.5 text-2xs cursor-pointer tracking-widest',
            follow ? 'border border-green-border text-green' : 'border border-border3 text-fg4',
          ].join(' ')}
        >
          {follow ? '● follow' : '○ paused'}
        </button>
      </div>

      {/* Log lines */}
      <div className="flex-1 overflow-y-auto py-1.5 bg-bg">
        {visible.map((entry, i) => {
          const levelM = entry.line.match(/\s(INFO|WARN|ERROR|LOG|DEBUG)\s/);
          const level  = levelM?.[1] ?? null;
          const isErr  = level === 'ERROR';
          const isWarn = level === 'WARN';
          const parts  = entry.line.match(/^(\S+)\s+(.*)$/);
          const time   = parts?.[1] ?? '';
          const rest   = parts?.[2] ?? entry.line;

          return (
            <div
              key={i}
              className={[
                'flex px-4 py-px text-sm leading-[18px] border-l-2',
                isErr  ? 'bg-red/[6%] border-l-red'
                : isWarn ? 'bg-amber/[4%] border-l-amber'
                : 'bg-transparent border-l-transparent',
              ].join(' ')}
            >
              <span className="text-fg6 mr-2.5 shrink-0 select-none w-7 text-right text-xs">{i + 1}</span>
              <span
                className="mr-2.5 shrink-0 w-[120px] overflow-hidden text-ellipsis whitespace-nowrap text-xs"
                style={{ color: entry.color, opacity: 0.85 }}
              >
                {entry.container}
              </span>
              <span className="text-fg5 mr-2.5 shrink-0 text-xs">{time}</span>
              <span className={isErr ? 'text-build-fail-text' : isWarn ? 'text-amber' : 'text-fg2'}>
                {rest}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Footer */}
      <div className="flex items-center gap-3 px-4 py-2 border-t border-border1 bg-panel text-2xs text-fg4 flex-wrap shrink-0">
        {members.map((m) => (
          <span key={m.id} className="flex items-center gap-1">
            <span className="w-1 h-1 rounded-full inline-block" style={{ background: colorMap[m.id] }} />
            <span>{m.name}</span>
          </span>
        ))}
        <span className="flex-1" />
        <span>click service chips to mute/unmute</span>
      </div>
    </div>
  );
}
