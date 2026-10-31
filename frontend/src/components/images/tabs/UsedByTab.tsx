import { Dot, StatusDot } from '../../ui/Dot';
import { useContainers } from '../../../hooks/useContainers';

interface UsedByTabProps {
  containerNames: string[];
}

export function UsedByTab({ containerNames }: UsedByTabProps) {
  const { data: containers = [] } = useContainers();

  return (
    <div>
      {containerNames.length === 0 ? (
        <div className="inline-flex items-center gap-1.5 text-sm text-amber"><Dot color="amber" /> not in use — safe to prune</div>
      ) : (
        containerNames.map((name) => {
          const c = containers.find((x) => x.name === name);
          return (
            <div key={name} className="flex items-center gap-2 py-1 text-sm">
              {c && <StatusDot status={c.status} size="sm" />}
              <span className="text-fg">{name}</span>
              {c && <span className="text-fg5 text-xs">{c.uptime ?? '—'}</span>}
            </div>
          );
        })
      )}
    </div>
  );
}
