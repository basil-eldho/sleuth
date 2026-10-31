import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { useAppStore } from '../../store';
import { MiniBar } from '../ui/MiniBar';
import type { Container } from '../../types/docker';

function humanBytes(b: number): string {
  if (b <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let n = b;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(i > 0 && n < 10 ? 1 : 0)} ${units[i]}`;
}

const CELL = 'flex flex-col gap-1.5 px-4 py-2 border-r border-border1 shrink-0';
const LABEL = 'font-sans text-2xs tracking-section uppercase text-fg5 font-semibold';

interface LiveStatStripProps {
  container: Container;
}

// A persistent live telemetry readout for the open container — CPU / MEM from
// the 2 s stats stream, plus cumulative network and block-I/O totals.
export function LiveStatStrip({ container: c }: LiveStatStripProps) {
  const live = useAppStore((s) => s.liveStats[c.id]);

  if (c.status === 'exited') return null;

  const cpu      = live?.cpu ?? c.cpu;
  const mem      = live?.mem ?? c.mem;
  const hasLimit = c.memLimit > 0;
  const memPct   = hasLimit ? mem / c.memLimit : 0;
  const cpuHot   = cpu > 70;
  const memHot   = hasLimit && memPct > 0.8;

  return (
    <div className="flex items-stretch border-b border-border1 bg-bg shrink-0 overflow-x-auto font-mono">
      <div className={CELL}>
        <span className={LABEL}>CPU</span>
        <span className="flex items-center gap-2.5">
          <MiniBar value={cpu} max={100} colorClass={cpuHot ? 'bg-amber' : 'bg-border3'} />
          <span className={`text-sm tabular-nums ${cpuHot ? 'text-amber' : 'text-fg'}`}>{cpu.toFixed(0)}%</span>
        </span>
      </div>

      <div className={CELL}>
        <span className={LABEL}>MEM</span>
        <span className="flex items-center gap-2.5">
          <MiniBar value={hasLimit ? mem : 0} max={hasLimit ? c.memLimit : 1} colorClass={memHot ? 'bg-red' : 'bg-border3'} />
          <span className={`text-sm tabular-nums ${memHot ? 'text-red' : 'text-fg'}`}>
            {mem.toFixed(0)}
            {hasLimit && <span className="text-fg5">/{c.memLimit.toFixed(0)}</span>}
            <span className="text-fg5 text-2xs ml-0.5">MB</span>
          </span>
        </span>
      </div>

      <div className={CELL}>
        <span className={LABEL}>Network</span>
        <span className="flex items-center gap-3 text-sm text-fg2 tabular-nums">
          <span className="inline-flex items-center gap-1">
            <ArrowDownToLine size={12} className="text-fg4" />{humanBytes(live?.netRx ?? 0)}
          </span>
          <span className="inline-flex items-center gap-1">
            <ArrowUpFromLine size={12} className="text-fg4" />{humanBytes(live?.netTx ?? 0)}
          </span>
        </span>
      </div>

      <div className={CELL}>
        <span className={LABEL}>Block I/O</span>
        <span className="flex items-center gap-3 text-sm text-fg2 tabular-nums">
          <span className="inline-flex items-center gap-1"><span className="text-fg5 text-2xs">R</span>{humanBytes(live?.blkRead ?? 0)}</span>
          <span className="inline-flex items-center gap-1"><span className="text-fg5 text-2xs">W</span>{humanBytes(live?.blkWrite ?? 0)}</span>
        </span>
      </div>
    </div>
  );
}
