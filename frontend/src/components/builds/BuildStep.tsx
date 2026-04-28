import type { BuildStep as BuildStepType } from '../../types/docker';

const ICON: Record<BuildStepType['status'], string> = {
  done:    '✓',
  running: '·',
  pending: '○',
  failed:  '✕',
};

const iconClass: Record<BuildStepType['status'], string> = {
  done:    'text-green',
  running: 'text-amber',
  pending: 'text-fg5',
  failed:  'text-red',
};

interface BuildStepProps {
  step: BuildStepType;
}

export function BuildStep({ step: s }: BuildStepProps) {
  const isCached = s.cached;

  return (
    <div className="pl-8">
      {/* gridTemplateColumns is a complex multi-column layout — Tailwind arbitrary value */}
      <div className="grid grid-cols-[14px_56px_90px_1fr_72px_70px] gap-2.5 items-baseline py-0.5 pr-4 text-sm">
        <span className={iconClass[s.status]}>{ICON[s.status]}</span>
        <span className="text-fg5 tabular-nums">[{s.n}/{s.total}]</span>
        <span className={isCached ? 'text-cache-hit' : 'text-blue'}>{s.instruction}</span>
        <span className="text-fg2 truncate">{s.detail}</span>
        <span className={`text-2xs tracking-wider ${isCached ? 'text-cache-hit' : ''}`}>
          {isCached ? 'CACHED' : ''}
        </span>
        <span className="text-xs text-fg4 text-right tabular-nums">{s.duration}</span>
      </div>

      {!isCached && s.cacheReason && s.status !== 'pending' && (
        <div className="mt-0.5 ml-20 text-2xs text-blue">↳ cache miss: {s.cacheReason}</div>
      )}

      {s.output && s.output.length > 0 && (
        <div className={`mt-1 mx-20 mr-4 p-1.5 pl-2.5 border-l-2 ${s.status === 'failed' ? 'bg-red/5 border-l-build-fail' : 'bg-card border-l-border2'}`}>
          {s.output.map((line, i) => (
            <div
              key={i}
              className={`text-xs leading-log ${s.status === 'failed' && line.startsWith('ERROR') ? 'text-build-fail-text' : 'text-fg3'}`}
            >
              {line}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
