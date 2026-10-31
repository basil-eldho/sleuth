import { useState, useEffect } from 'react';
import { ArrowLeft, Play, Square, RotateCw, Trash2 } from 'lucide-react';
import { PostMortem } from './PostMortem';
import { LiveStatStrip } from './LiveStatStrip';
import { OverviewTab } from './tabs/OverviewTab';
import { LogsTab } from './tabs/LogsTab';
import { StatsTab } from './tabs/StatsTab';
import { MountsTab } from './tabs/MountsTab';
import { ExecTab } from './tabs/ExecTab';
import { InspectTab } from './tabs/InspectTab';
import { StatusDot } from '../ui/Dot';
import { CopyText } from '../ui/CopyText';
import { DetailBtn } from '../ui/TopBtn';
import { useContainer } from '../../hooks/useContainer';
import { useLogs } from '../../hooks/useLogs';
import { useContainerActions } from '../../hooks/useContainerActions';
import type { Container, ContainerStatus } from '../../types/docker';

const TABS = [
  { id: 'overview', label: 'overview', cmd: 'docker container inspect',        key: '1' },
  { id: 'logs',     label: 'logs',     cmd: 'docker logs -f',                  key: '2' },
  { id: 'stats',    label: 'stats',    cmd: 'docker stats',                    key: '3' },
  { id: 'mounts',   label: 'mounts',   cmd: 'docker inspect --format mounts',  key: '4' },
  { id: 'exec',     label: 'exec',     cmd: 'docker exec -it',                 key: '5' },
  { id: 'inspect',  label: 'inspect',  cmd: 'docker inspect',                  key: '6' },
] as const;

type TabId = (typeof TABS)[number]['id'];

const STATUS_LABEL: Record<ContainerStatus, string> = {
  running: 'running',
  warning: 'unhealthy',
  exited:  'exited',
};

const statusTextClass: Record<ContainerStatus, string> = {
  running: 'text-green',
  warning: 'text-amber',
  exited:  'text-red',
};

interface ContainerDetailProps {
  container: Container;
  onClose: () => void;
}

export function ContainerDetail({ container: c, onClose }: ContainerDetailProps) {
  const [tab, setTab] = useState<TabId>('overview');

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); return; }
      const inField =
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement ||
        document.activeElement instanceof HTMLSelectElement;
      if (inField || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = TABS.find((t) => t.key === e.key);
      if (t) setTab(t.id);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Fresh detail data polled every 3s — falls back to the prop when backend is down
  const { data: freshContainer } = useContainer(c.id);
  const container = freshContainer ?? c;

  const logLines = useLogs(c.id);
  const actions = useContainerActions(container.id);

  return (
    <div className="flex-1 flex flex-col bg-bg overflow-hidden">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border1 bg-card shrink-0 font-sans">
        <div className="flex items-center gap-2.5 min-w-0 overflow-hidden whitespace-nowrap">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1 bg-transparent border-none cursor-pointer text-fg4 text-xs px-0 hover:text-fg2 transition-colors"
          >
            <ArrowLeft size={12} /> containers
          </button>
          <span className="text-fg6 text-xs">/</span>
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <StatusDot status={container.status} />
            <span className="text-sm text-fg font-medium">{container.name}</span>
            <span className={`text-2xs ${statusTextClass[container.status]} whitespace-nowrap`}>
              {STATUS_LABEL[container.status]}
            </span>
          </span>
          <span className="text-xs whitespace-nowrap font-mono">
            <CopyText value={container.hash} colorClass="text-fg5">{container.hash}</CopyText>
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
          {container.status === 'exited' ? (
            <DetailBtn primary disabled={actions.busy} onClick={() => actions.start.mutate()}>
              {actions.start.isPending ? '…' : <span className="inline-flex items-center gap-1"><Play size={12} /> start</span>}
            </DetailBtn>
          ) : (
            <>
              <DetailBtn disabled={actions.busy} onClick={() => actions.stop.mutate()}>
                {actions.stop.isPending ? '…' : <span className="inline-flex items-center gap-1"><Square size={12} /> stop</span>}
              </DetailBtn>
              <DetailBtn disabled={actions.busy} onClick={() => actions.restart.mutate()}>
                {actions.restart.isPending ? '…' : <span className="inline-flex items-center gap-1"><RotateCw size={12} /> restart</span>}
              </DetailBtn>
            </>
          )}
          <DetailBtn danger disabled={actions.busy} onClick={() => actions.remove.mutate(undefined, { onSuccess: onClose })}>
            {actions.remove.isPending ? '…' : <span className="inline-flex items-center gap-1"><Trash2 size={12} /> remove</span>}
          </DetailBtn>
          <span className="ml-2 text-2xs text-fg5 whitespace-nowrap">esc to close</span>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center border-b border-border1 bg-panel pl-1.5 shrink-0 font-sans">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={[
                'bg-transparent border-none cursor-pointer px-3 py-1.5 text-sm flex items-baseline gap-1.5 border-b -mb-px transition-colors',
                active
                  ? 'text-fg border-b-fg'
                  : 'text-fg4 border-b-transparent hover:text-fg3',
              ].join(' ')}
            >
              <span className={`font-mono ${active ? 'text-accent text-2xs' : 'text-fg6 text-2xs'}`}>{t.key}</span>
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Live telemetry readout (CPU / MEM / network / block-I/O) */}
      <LiveStatStrip container={container} />

      {/* Post-mortem banner — shown when backend provides exit info */}
      {container.status === 'exited' && container.exitInfo && (
        <PostMortem info={container.exitInfo} onViewLogs={() => setTab('logs')} />
      )}

      {/* Tab body */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {tab === 'overview' && <OverviewTab container={container} />}
        {tab === 'logs'     && <LogsTab lines={logLines} />}
        {tab === 'stats'    && <StatsTab container={container} />}
        {tab === 'mounts'   && <MountsTab container={container} />}
        {tab === 'exec'     && <ExecTab container={container} />}
        {tab === 'inspect'  && <InspectTab container={container} />}
      </div>
    </div>
  );
}
