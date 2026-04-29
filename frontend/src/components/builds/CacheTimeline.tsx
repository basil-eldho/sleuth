import type { BuildStep } from '../../types/docker';

const stepBgClass: Record<BuildStep['status'], string> = {
  done:    'bg-blue',
  running: 'bg-blue',
  pending: 'bg-border1 opacity-50',
  failed:  'bg-build-fail',
};

interface CacheTimelineProps {
  steps: BuildStep[];
}

export function CacheTimeline({ steps }: CacheTimelineProps) {
  const total       = steps.reduce((a, s) => a + Math.max(s.durationMs, 30), 0);
  const cachedMs    = steps.filter((s) => s.cached).reduce((a, s) => a + Math.max(s.durationMs, 30), 0);
  const pct         = total ? Math.round((cachedMs / total) * 100) : 0;
  const cachedCount = steps.filter((s) => s.cached).length;

  return (
    <div className="px-4 pb-3.5 pl-8">
      <div className="flex items-baseline justify-between mb-1.5 gap-3 whitespace-nowrap">
        <span className="text-2xs tracking-section text-fg5">CACHE TIMELINE</span>
        <span className="text-xs text-fg4">
          <span className="text-cache-hit">{cachedCount}/{steps.length}</span> cached ·{' '}
          <span className="text-cache-hit">{pct}%</span> time saved
        </span>
      </div>

      <div className="flex h-3.5 gap-px bg-input rounded-sm overflow-hidden">
        {steps.map((s) => {
          const colorClass = s.cached ? 'bg-cache-hit' : stepBgClass[s.status];
          return (
            <div
              key={s.n}
              title={`[${s.n}] ${s.instruction} ${s.detail} — ${s.duration}${s.cached ? ' (CACHED)' : s.cacheReason ? ` (miss: ${s.cacheReason})` : ''}`}
              // width is a runtime % — legitimate inline style
              style={{ width: `${(Math.max(s.durationMs, 30) / total) * 100}%` }}
              className={`cursor-help ${colorClass}`}
            />
          );
        })}
      </div>

      <div className="flex gap-3.5 mt-1.5 text-2xs text-fg4 flex-wrap">
        <span><span className="text-cache-hit">■</span> cached</span>
        <span><span className="text-blue">■</span> rebuilt</span>
        <span><span className="text-build-fail">■</span> failed</span>
        <span><span className="text-border1">■</span> pending</span>
      </div>
    </div>
  );
}
