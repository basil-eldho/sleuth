import { CopyText } from '../../ui/CopyText';
import type { Container } from '../../../types/docker';

interface MountsTabProps {
  container: Container;
}

export function MountsTab({ container: c }: MountsTabProps) {
  const mounts = c.mounts ?? [];

  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="text-2xs text-fg5 tracking-section mb-2.5">
        BIND MOUNTS · {mounts.length}
      </div>

      {mounts.length === 0 && (
        <div className="text-sm text-fg4 py-6 text-center">
          no bind mounts
        </div>
      )}

      <div className="flex flex-col gap-px">
        {mounts.map((m, i) => (
          <div key={i} className="flex items-center gap-2 px-3 py-2 bg-card text-sm">
            <CopyText value={m.host}>{m.host}</CopyText>
            <span className="text-fg5">→</span>
            <CopyText value={m.container}>{m.container}</CopyText>
            <span className={`text-2xs tracking-status ml-auto ${m.mode === 'ro' ? 'text-blue' : 'text-green'}`}>
              [{m.mode}]
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
