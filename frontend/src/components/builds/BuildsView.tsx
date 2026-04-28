import { useState } from 'react';
import { CacheTimeline } from './CacheTimeline';
import { BuildStep } from './BuildStep';
import { Dot } from '../ui/Dot';
import { CopyText } from '../ui/CopyText';
import type { Build } from '../../types/docker';
import type { DotColor } from '../ui/Dot';

const statusDotColor: Record<Build['status'], DotColor> = {
  running: 'amber',
  success: 'green',
  failed:  'red',
};

const statusTextClass: Record<Build['status'], string> = {
  running: 'text-amber',
  success: 'text-green',
  failed:  'text-red',
};

interface BuildsViewProps {
  builds: Build[];
}

export function BuildsView({ builds }: BuildsViewProps) {
  const [openId, setOpenId] = useState<string | null>(builds[0]?.id ?? null);

  return (
    <div className="flex-1 overflow-auto font-mono">
      {builds.map((b) => {
        const isOpen = openId === b.id;

        return (
          <div key={b.id} className="border-b border-border1">
            {/* Build header row */}
            <div
              onClick={() => setOpenId(isOpen ? null : b.id)}
              className={`grid grid-cols-[24px_16px_1fr_240px_80px_110px_90px] items-center gap-3 px-4 py-2.5 cursor-pointer whitespace-nowrap transition-colors ${isOpen ? 'bg-card' : 'hover:bg-hover'}`}
            >
              <span className="text-fg5 text-2xs">{isOpen ? '▼' : '▶'}</span>
              <Dot color={statusDotColor[b.status]} />
              <span className="text-base text-fg truncate">{b.image}</span>
              <CopyText value={b.context} colorClass="text-fg4">
                <span className="text-xs">{b.context}</span>
              </CopyText>
              <span className={`text-xs ${statusTextClass[b.status]}`}>[{b.status}]</span>
              <span className="text-xs text-fg3 tabular-nums">{b.duration}</span>
              <span className="text-xs text-fg4">{b.finished}</span>
            </div>

            {/* Expanded: timeline + steps */}
            {isOpen && (
              <div className="bg-panel py-1.5 pb-3.5">
                <CacheTimeline steps={b.steps} />
                {b.steps.map((s) => <BuildStep key={s.n} step={s} />)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
