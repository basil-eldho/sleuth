import { DetailBtn } from '../ui/TopBtn';
import type { ExitInfo } from '../../types/docker';

interface PostMortemProps {
  info: ExitInfo;
  onViewLogs: () => void;
}

export function PostMortem({ info, onViewLogs }: PostMortemProps) {
  return (
    <div className="bg-red/10 border-b border-fg6 border-l-2 border-l-red px-4 py-2.5 shrink-0">
      <div className="flex items-center gap-2.5 mb-1.5">
        <span className="text-red text-sm">
          ✕ exited · code {info.code}
          {info.signal ? ` (${info.signal})` : ''} · {info.at}
        </span>
        {info.killedBy === 'oom' && (
          <span className="text-2xs text-amber tracking-status">⚠ OOM-KILLED</span>
        )}
        <span className="flex-1" />
        <DetailBtn onClick={onViewLogs}>view full logs</DetailBtn>
      </div>
      <div className="text-sm text-build-fail-text mb-1.5">{info.reason}</div>
      <div className="bg-panel border border-border2 rounded-sm px-2.5 py-1.5 text-xs text-fg3 max-h-[90px] overflow-auto leading-log">
        {info.tail.map((line, i) => (
          <div
            key={i}
            className={/error|fatal|failed/i.test(line) ? 'text-red' : 'text-fg3'}
          >
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}
