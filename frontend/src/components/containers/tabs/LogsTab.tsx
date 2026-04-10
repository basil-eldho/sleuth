import { useState, useRef, useEffect, useMemo } from 'react';

const LEVEL_COLORS: Record<string, string> = {
  INFO:  'text-blue',
  WARN:  'text-amber',
  ERROR: 'text-red',
  LOG:   'text-cache-hit',
  DEBUG: 'text-fg4',
};

const ALL_LEVELS = ['INFO', 'WARN', 'ERROR', 'DEBUG'] as const;

interface ParsedLine {
  time: string;
  level: string;
  msg: string;
}

function parseLine(line: string): ParsedLine {
  const m = line.match(/^(\S+)\s+(INFO|WARN|ERROR|LOG|DEBUG)\s+(.*)$/);
  if (!m) return { time: '', level: '', msg: line };
  return { time: m[1], level: m[2], msg: m[3] };
}

interface LogsTabProps {
  lines: string[];
}

export function LogsTab({ lines }: LogsTabProps) {
  const [follow, setFollow] = useState(true);
  const [filter, setFilter] = useState('');
  const [levels, setLevels] = useState<Set<string>>(new Set(ALL_LEVELS));
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (follow) bottomRef.current?.scrollIntoView();
  }, [follow]);

  function toggleLevel(l: string) {
    setLevels((prev) => {
      const next = new Set(prev);
      next.has(l) ? next.delete(l) : next.add(l);
      return next;
    });
  }

  const visible = useMemo(
    () =>
      lines.filter((l) => {
        const p = parseLine(l);
        if (p.level && !levels.has(p.level)) return false;
        if (filter && !l.toLowerCase().includes(filter.toLowerCase())) return false;
        return true;
      }),
    [lines, levels, filter],
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center gap-3.5 px-4 py-2 border-b border-border1 bg-panel shrink-0">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="grep..."
          className="bg-input border border-border3 rounded-sm px-2 py-0.5 text-fg2 text-sm outline-none w-[200px]"
        />
        <div className="flex gap-1">
          {ALL_LEVELS.map((l) => (
            <button
              key={l}
              onClick={() => toggleLevel(l)}
              className={[
                'bg-transparent rounded-sm px-1.5 py-0.5 text-2xs cursor-pointer tracking-status',
                levels.has(l)
                  ? `border border-border3 ${LEVEL_COLORS[l]}`
                  : 'border border-border1 text-fg6',
              ].join(' ')}
            >
              [{l.toLowerCase()}]
            </button>
          ))}
        </div>
        <span className="flex-1" />
        <span className="text-xs text-fg5">
          {visible.length} / {lines.length} lines
        </span>
        <button
          onClick={() => setFollow((f) => !f)}
          className={[
            'bg-transparent rounded-sm px-2 py-0.5 text-2xs cursor-pointer tracking-widest',
            follow
              ? 'border border-green-border text-green'
              : 'border border-border3 text-fg4',
          ].join(' ')}
        >
          {follow ? '● follow' : '○ paused'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-1.5 bg-bg">
        {visible.map((line, i) => {
          const p = parseLine(line);
          const isErr = p.level === 'ERROR';
          return (
            <div
              key={i}
              className={[
                'flex px-4 py-px text-sm leading-[18px] border-l-2',
                isErr ? 'bg-red/10 border-l-red' : 'bg-transparent border-l-transparent',
              ].join(' ')}
            >
              <span className="text-fg6 mr-3 shrink-0 select-none w-8 text-right">{i + 1}</span>
              <span className="text-fg5 mr-3.5 shrink-0">{p.time}</span>
              {p.level && (
                <span className={`${LEVEL_COLORS[p.level] ?? 'text-fg4'} mr-2.5 shrink-0`}>
                  [{p.level.toLowerCase()}]
                </span>
              )}
              <span className={isErr ? 'text-build-fail-text' : 'text-fg2'}>{p.msg}</span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
