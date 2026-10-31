import { useAppStore } from '../../../store';
import type { Container, StatSample } from '../../../types/docker';

function humanRate(bps: number): string {
  if (bps < 1024) return `${bps.toFixed(0)} B/s`;
  if (bps < 1024 ** 2) return `${(bps / 1024).toFixed(1)} KB/s`;
  if (bps < 1024 ** 3) return `${(bps / 1024 / 1024).toFixed(1)} MB/s`;
  return `${(bps / 1024 / 1024 / 1024).toFixed(2)} GB/s`;
}

interface MetricProps {
  title: string;
  value: string;
  sub: string;
  series: number[];
  max: number;
  strokeClass: string;
}

function Metric({ title, value, sub, series, max, strokeClass }: MetricProps) {
  const W = 480;
  const H = 60;
  const pts =
    series.length >= 2
      ? series
          .map((v, i) => `${(i / (series.length - 1)) * W},${H - (Math.min(v, max) / max) * H}`)
          .join(' ')
      : '';

  return (
    <div className="border border-border1 bg-card px-3.5 py-3">
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-2xs tracking-section text-fg5 uppercase font-sans font-semibold">{title}</span>
        <span className="text-2xs text-fg5 font-sans">{sub}</span>
      </div>
      <div className="text-lg text-fg mb-1.5 tabular-nums">{value}</div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={`w-full block h-[60px] ${strokeClass}`}>
        <polyline points={pts} fill="none" strokeWidth="1" vectorEffect="non-scaling-stroke" stroke="currentColor" />
      </svg>
    </div>
  );
}

interface StatsTabProps {
  container: Container;
}

// Rate (per second) series derived from the cumulative counters.
function rateSeries(hist: StatSample[], key: 'netRx' | 'netTx' | 'blkRead' | 'blkWrite'): number[] {
  const out: number[] = [];
  for (let i = 1; i < hist.length; i++) {
    const dt = (hist[i].t - hist[i - 1].t) / 1000 || 2;
    out.push(Math.max(0, (hist[i][key] - hist[i - 1][key]) / dt));
  }
  return out;
}

export function StatsTab({ container: c }: StatsTabProps) {
  const hist = useAppStore((s) => s.statsHistory[c.id] ?? []);

  if (c.status === 'exited') {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-fg4">
        container is stopped — no live stats
      </div>
    );
  }
  if (hist.length < 2) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-fg4">
        collecting live stats…
      </div>
    );
  }

  const cpuSeries = hist.map((h) => h.cpu);
  const memSeries = hist.map((h) => h.mem);
  const netRx = rateSeries(hist, 'netRx');
  const netTx = rateSeries(hist, 'netTx');
  const blkR = rateSeries(hist, 'blkRead');
  const blkW = rateSeries(hist, 'blkWrite');

  const lastOf = (s: number[]) => (s.length ? s[s.length - 1] : 0);
  const peak = (s: number[]) => Math.max(1, ...s);

  const curCpu = lastOf(cpuSeries);
  const curMem = lastOf(memSeries);
  const hasLimit = c.memLimit > 0;
  const memPct = hasLimit ? curMem / c.memLimit : 0;
  const cpuStroke = curCpu > 70 ? 'text-amber' : 'text-green';
  const memStroke = memPct > 1 ? 'text-red' : memPct > 0.8 ? 'text-amber' : 'text-green';

  return (
    <div className="flex-1 overflow-auto p-4 grid grid-cols-2 gap-3.5 content-start">
      <Metric title="cpu" value={`${curCpu.toFixed(1)}%`} sub="of 100%" series={cpuSeries} max={100} strokeClass={cpuStroke} />
      <Metric
        title="memory"
        value={`${curMem.toFixed(0)} MB`}
        sub={hasLimit ? `of ${c.memLimit.toFixed(0)} MB` : 'no limit'}
        series={memSeries}
        max={hasLimit ? c.memLimit : peak(memSeries)}
        strokeClass={memStroke}
      />
      <Metric title="net rx" value={humanRate(lastOf(netRx))} sub="received" series={netRx} max={peak(netRx)} strokeClass="text-blue" />
      <Metric title="net tx" value={humanRate(lastOf(netTx))} sub="transmitted" series={netTx} max={peak(netTx)} strokeClass="text-blue" />
      <Metric title="block read" value={humanRate(lastOf(blkR))} sub="disk read" series={blkR} max={peak(blkR)} strokeClass="text-warm" />
      <Metric title="block write" value={humanRate(lastOf(blkW))} sub="disk write" series={blkW} max={peak(blkW)} strokeClass="text-warm" />
    </div>
  );
}
