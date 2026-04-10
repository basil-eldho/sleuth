import { useState, useEffect } from 'react';
import type { Container } from '../../../types/docker';

function genSeries(base: number, jitter: number, len = 60): number[] {
  return Array.from({ length: len }, (_, i) =>
    Math.max(0, base + (Math.sin(i / 4) * jitter * 0.5) + (Math.random() - 0.5) * jitter),
  );
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
  const pts = series
    .map((v, i) => `${(i / (series.length - 1)) * W},${H - (Math.min(v, max) / max) * H}`)
    .join(' ');

  return (
    <div className="border border-border1 bg-card px-3.5 py-3">
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-2xs tracking-section text-fg5 uppercase">{title}</span>
        <span className="text-2xs text-fg5">{sub}</span>
      </div>
      <div className="text-lg text-fg mb-1.5">{value}</div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className={`w-full block ${strokeClass}`}
        style={{ height: 60 }}
      >
        <polyline
          points={pts}
          fill="none"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          stroke="currentColor"
        />
      </svg>
    </div>
  );
}

interface StatsTabProps {
  container: Container;
}

export function StatsTab({ container: c }: StatsTabProps) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1500);
    return () => clearInterval(id);
  }, []);

  const exited = c.status === 'exited';
  const zeros  = Array<number>(60).fill(0);

  const cpu    = exited ? zeros : genSeries(c.cpu, 6);
  const mem    = exited ? zeros : genSeries(c.mem, 18);
  const netRx  = exited ? zeros : genSeries(120, 80);
  const netTx  = exited ? zeros : genSeries(60, 40);
  const blkR   = exited ? zeros : genSeries(8, 6);
  const blkW   = exited ? zeros : genSeries(14, 10);

  const cpuStroke  = c.cpu > 70 ? 'text-amber' : 'text-green';
  const memPct     = c.mem / c.memLimit;
  const memStroke  = memPct > 1.0 ? 'text-red' : memPct > 0.8 ? 'text-amber' : 'text-green';

  const last = (s: number[]) => s[s.length - 1];

  return (
    <div className="flex-1 overflow-auto p-4 grid grid-cols-2 gap-3.5 content-start">
      <Metric
        title="cpu"
        value={`${c.cpu.toFixed(1)}%`}
        sub="of 100%"
        series={cpu}
        max={100}
        strokeClass={cpuStroke}
      />
      <Metric
        title="memory"
        value={`${c.mem} MB`}
        sub={`of ${c.memLimit} MB`}
        series={mem}
        max={c.memLimit}
        strokeClass={memStroke}
      />
      <Metric
        title="net rx"
        value={`${Math.round(last(netRx))} kb/s`}
        sub="received"
        series={netRx}
        max={400}
        strokeClass="text-blue"
      />
      <Metric
        title="net tx"
        value={`${Math.round(last(netTx))} kb/s`}
        sub="transmitted"
        series={netTx}
        max={400}
        strokeClass="text-blue"
      />
      <Metric
        title="block read"
        value={`${last(blkR).toFixed(1)} mb/s`}
        sub="disk read"
        series={blkR}
        max={50}
        strokeClass="text-warm"
      />
      <Metric
        title="block write"
        value={`${last(blkW).toFixed(1)} mb/s`}
        sub="disk write"
        series={blkW}
        max={50}
        strokeClass="text-warm"
      />
    </div>
  );
}
