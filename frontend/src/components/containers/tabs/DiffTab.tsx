import { CONTAINER_DIFF } from '../../../data/mock';
import type { Container, FileDiff } from '../../../types/docker';

const DIFF_KIND: Record<FileDiff['kind'], { glyph: string; colorClass: string; label: string }> = {
  A: { glyph: '+', colorClass: 'text-green',  label: 'added'   },
  C: { glyph: '~', colorClass: 'text-amber',  label: 'changed' },
  D: { glyph: '-', colorClass: 'text-red',    label: 'deleted' },
};

interface DiffTabProps {
  container: Container;
}

export function DiffTab({ container: c }: DiffTabProps) {
  const entries = CONTAINER_DIFF[c.id] ?? [];
  const counts  = { A: 0, C: 0, D: 0 };
  entries.forEach((e) => { counts[e.kind]++; });

  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="text-2xs text-fg5 tracking-section mb-2.5 flex gap-4">
        <span>FS DIFF · {entries.length} CHANGES SINCE IMAGE</span>
        <span className="text-green">+{counts.A} added</span>
        <span className="text-amber">~{counts.C} changed</span>
        <span className="text-red">−{counts.D} deleted</span>
      </div>

      {entries.length === 0 && (
        <div className="text-sm text-fg4 py-6 text-center">
          no changes — container filesystem matches image
        </div>
      )}

      <div className="text-sm">
        {entries.map((e, i) => {
          const k = DIFF_KIND[e.kind];
          return (
            <div key={i} className="flex gap-3 py-0.5 items-baseline">
              <span className={`${k.colorClass} w-4 text-center`}>{k.glyph}</span>
              <span className={`${k.colorClass} text-2xs tracking-status w-[60px]`}>{k.label}</span>
              <span className="text-fg2">{e.path}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 text-xs text-fg4 border-t border-border1 pt-2.5">
        comparing layer fs against image ·{' '}
        <span className="text-blue">$ docker diff {c.name}</span>
      </div>
    </div>
  );
}
