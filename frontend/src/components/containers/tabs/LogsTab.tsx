import { useState, useRef, useEffect, useMemo } from 'react';

// Tinted chip styling for the level pills + active toolbar filters. Keyed by the
// named level buckets; the opacity utilities derive from the accent tokens via
// color-mix (same pattern as the error-row tint).
const LEVEL_CHIP: Record<string, string> = {
  INFO:  'bg-blue/15 border-blue/40 text-blue',
  WARN:  'bg-amber/15 border-amber/40 text-amber',
  ERROR: 'bg-red/15 border-red/40 text-red',
  DEBUG: 'bg-fg3/15 border-fg3/40 text-fg2',
  LOG:   'bg-green/15 border-green/40 text-green',
};

const ALL_LEVELS = ['INFO', 'WARN', 'ERROR', 'DEBUG'] as const;

// Fields that are either structural (pino book-keeping) or constant across every
// line from a service, so showing them per-line is just noise.
const HIDDEN_FIELDS = new Set([
  'level',
  'time',
  'msg',
  'pid',
  'hostname',
  'v',
  'service',
  'version',
  'env',
]);

// CSI/SGR escape sequences (colors, cursor moves) that pino-pretty and other
// colorized loggers emit; the browser renders them as literal garbage, so strip.
const ANSI_RE = /\x1b\[[0-9;]*[A-Za-z]/g;
// A Docker-prepended RFC3339 timestamp (logs are streamed with Timestamps: true).
const DOCKER_TS_RE = /^(\d{4}-\d{2}-\d{2}T[\d:.]+Z?)\s+/;

interface ParsedLine {
  time: string;
  level: string;
  msg: string;
  fields: Array<[string, string]>;
  raw: string;
}

// pino writes numeric levels on the wire (10 trace … 60 fatal); map them to the
// named buckets the viewer colors and filters by.
function levelName(value: unknown): string {
  if (typeof value === 'number') {
    if (value >= 50) return 'ERROR'; // error + fatal
    if (value >= 40) return 'WARN';
    if (value >= 30) return 'INFO';
    return 'DEBUG'; // debug + trace
  }
  if (typeof value === 'string') {
    const map: Record<string, string> = {
      TRACE: 'DEBUG',
      DEBUG: 'DEBUG',
      INFO: 'INFO',
      WARN: 'WARN',
      WARNING: 'WARN',
      ERROR: 'ERROR',
      FATAL: 'ERROR',
      LOG: 'LOG',
    };
    return map[value.toUpperCase()] ?? '';
  }
  return '';
}

function formatTime(ms: number): string {
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(11, 23); // HH:MM:SS.mmm
}

function formatValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  let s: string;
  try {
    s = JSON.stringify(value);
  } catch {
    s = String(value);
  }
  return s.length > 300 ? `${s.slice(0, 300)}…` : s;
}

function parseLine(line: string): ParsedLine {
  const clean = line.replace(ANSI_RE, '').replace(/\s+$/, '');

  // Structured pino JSON, optionally behind a Docker timestamp prefix.
  const tsMatch = clean.match(DOCKER_TS_RE);
  const dockerTime = tsMatch ? tsMatch[1] : '';
  const body = tsMatch ? clean.slice(tsMatch[0].length).trim() : clean.trim();
  if (body.startsWith('{') && body.endsWith('}')) {
    try {
      const obj = JSON.parse(body) as Record<string, unknown>;
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
        const level = levelName(obj.level);
        const time =
          typeof obj.time === 'number' ? formatTime(obj.time) : dockerTime;
        const msg = typeof obj.msg === 'string' ? obj.msg : '';
        const fields = Object.entries(obj)
          .filter(([k]) => !HIDDEN_FIELDS.has(k))
          .map(([k, v]) => [k, formatValue(v)] as [string, string]);
        return { time, level, msg, fields, raw: line };
      }
    } catch {
      // Not valid JSON after all — fall through to the plain-text path.
    }
  }

  // Plain text in `<time> LEVEL <message>` shape.
  const m = clean.match(/^(\S+)\s+(INFO|WARN|ERROR|LOG|DEBUG)\s+(.*)$/);
  if (m) return { time: m[1], level: m[2], msg: m[3], fields: [], raw: line };

  return { time: '', level: '', msg: clean, fields: [], raw: line };
}

interface LogsTabProps {
  lines: string[];
}

export function LogsTab({ lines }: LogsTabProps) {
  const [follow, setFollow] = useState(true);
  const [filter, setFilter] = useState('');
  const [levels, setLevels] = useState<Set<string>>(new Set(ALL_LEVELS));
  const bottomRef = useRef<HTMLDivElement>(null);

  function toggleLevel(l: string) {
    setLevels((prev) => {
      const next = new Set(prev);
      next.has(l) ? next.delete(l) : next.add(l);
      return next;
    });
  }

  const parsed = useMemo(() => lines.map(parseLine), [lines]);

  const visible = useMemo(
    () =>
      parsed.filter((p) => {
        if (p.level && !levels.has(p.level)) return false;
        if (filter && !p.raw.toLowerCase().includes(filter.toLowerCase())) return false;
        return true;
      }),
    [parsed, levels, filter],
  );

  // Keep the viewport pinned to the newest line while following — re-run as new
  // lines arrive, not only when the toggle flips.
  useEffect(() => {
    if (follow) bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [follow, visible.length]);

  const empty = lines.length === 0;
  const filtered = !empty && visible.length === 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border2 bg-panel shrink-0">
        <div className="relative w-[220px]">
          <input
            name="container-log-filter"
            aria-label="Filter container logs"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="grep…"
            className="w-full bg-input border border-border3 rounded-sm pl-2 pr-6 py-1 text-fg text-sm outline-none focus:border-fg4 transition-colors"
          />
          {filter && (
            <button
              onClick={() => setFilter('')}
              aria-label="Clear filter"
              className="absolute right-1 top-1/2 -translate-y-1/2 text-fg4 hover:text-fg2 cursor-pointer px-1 leading-none"
            >
              ×
            </button>
          )}
        </div>
        <div className="flex gap-1">
          {ALL_LEVELS.map((l) => {
            const on = levels.has(l);
            return (
              <button
                key={l}
                onClick={() => toggleLevel(l)}
                aria-pressed={on}
                className={[
                  'rounded-sm px-1.5 py-0.5 text-2xs cursor-pointer tracking-status border transition-colors',
                  on
                    ? LEVEL_CHIP[l]
                    : 'bg-transparent border-border2 text-fg4 hover:text-fg2 hover:border-border3',
                ].join(' ')}
              >
                {l.toLowerCase()}
              </button>
            );
          })}
        </div>
        <span className="flex-1" />
        <span className="text-xs text-fg3 tabular-nums">
          <span className="text-fg2">{visible.length}</span>
          <span className="text-fg4"> / {lines.length}</span> lines
        </span>
        <button
          onClick={() => setFollow((f) => !f)}
          aria-pressed={follow}
          className={[
            'inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-2xs cursor-pointer tracking-widest border transition-colors',
            follow
              ? 'bg-green/10 border-green-border text-green'
              : 'bg-transparent border-border3 text-fg3 hover:text-fg2',
          ].join(' ')}
        >
          {follow
            ? <><span className="w-1.5 h-1.5 rounded-full bg-green inline-block" /> follow</>
            : <><span className="w-1.5 h-1.5 rounded-full border border-fg5 inline-block" /> paused</>}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-1.5 bg-bg">
        {empty && (
          <div className="h-full flex items-center justify-center text-sm text-fg3">
            No log output yet.
          </div>
        )}
        {filtered && (
          <div className="h-full flex flex-col items-center justify-center gap-1 text-sm text-fg3">
            <span>No lines match the current filter.</span>
            <span className="text-xs text-fg4">
              Clear the grep box or re-enable a level above.
            </span>
          </div>
        )}
        {visible.map((p, i) => {
          const isErr = p.level === 'ERROR';
          return (
            <div
              key={i}
              className={[
                'group flex px-4 py-0.5 text-sm leading-[18px] border-l-2',
                isErr
                  ? 'bg-red/10 border-l-red'
                  : 'bg-transparent border-l-transparent hover:bg-hover',
              ].join(' ')}
            >
              <span className="text-fg4 mr-3 shrink-0 select-none w-8 text-right tabular-nums">
                {i + 1}
              </span>
              {p.time && <span className="text-fg3 mr-3.5 shrink-0 tabular-nums">{p.time}</span>}
              {p.level && (
                <span
                  className={[
                    'mr-2.5 shrink-0 rounded-sm px-1 border text-2xs leading-[18px] self-start tracking-status',
                    LEVEL_CHIP[p.level] ?? 'bg-fg3/15 border-fg3/40 text-fg2',
                  ].join(' ')}
                >
                  {p.level.toLowerCase()}
                </span>
              )}
              <span className="flex-1 min-w-0 flex flex-wrap gap-x-2.5">
                <span className={isErr ? 'text-red' : 'text-fg'}>{p.msg}</span>
                {p.fields.map(([k, v]) => (
                  <span key={k} className="text-fg2">
                    <span className="text-fg3">{k}</span>
                    <span className="text-fg4">=</span>
                    <span className="break-all">{v}</span>
                  </span>
                ))}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
