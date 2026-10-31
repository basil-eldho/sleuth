import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useAppStore } from '../../store';
import { Dot, StatusDot } from '../ui/Dot';
import { CopyText } from '../ui/CopyText';
import type { Stack, Container, ContainerStatus } from '../../types/docker';

const statusTextClass: Record<ContainerStatus, string> = {
  running: 'text-green', warning: 'text-amber', exited: 'text-red',
};
const statusWord: Record<ContainerStatus, string> = {
  running: 'running', warning: 'unhealthy', exited: 'exited',
};

interface StackBtnProps {
  label: string;
  colorClass: string;
  onClick?: () => void;
}

function StackBtn({ label, colorClass, onClick }: StackBtnProps) {
  return (
    <button
      onClick={onClick}
      className={`bg-input border border-border3 rounded-sm px-2.5 py-0.5 text-xs text-fg3 cursor-pointer font-mono transition-colors hover:border-fg6 hover:${colorClass}`}
    >
      {label}
    </button>
  );
}

interface StacksViewProps {
  stacks: Stack[];
  containers: Container[];
}

export function StacksView({ stacks, containers }: StacksViewProps) {
  const [open, setOpen] = useState<Set<string>>(() => new Set(stacks.map((s) => s.id)));
  const selectContainer = useAppStore((s) => s.selectContainer);
  const setActiveNav    = useAppStore((s) => s.setActiveNav);
  const store = useAppStore();

  function toggle(id: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function openStackGraph(id: string) {
    store.setActiveNav('stacks');
    useAppStore.setState({ selectedStackGraph: id });
  }

  function openStackLogs(id: string) {
    useAppStore.setState({ selectedStackLogs: id });
  }

  return (
    <div className="flex-1 overflow-auto font-mono">
      {stacks.map((stack) => {
        const members     = containers.filter((c) => c.stack === stack.id);
        const runningCount = members.filter((c) => c.status === 'running').length;
        const isOpen      = open.has(stack.id);
        const allRunning  = runningCount === members.length;
        const noneRunning = runningCount === 0;
        const dotColor    = allRunning ? 'green' : noneRunning ? 'red' : 'amber';

        return (
          <div key={stack.id} className="border-b border-border1">
            {/* Stack header */}
            <div
              onClick={() => toggle(stack.id)}
              className={`flex items-center justify-between px-4 py-3 cursor-pointer gap-3 ${isOpen ? 'bg-card' : 'hover:bg-hover'} transition-colors`}
            >
              <div className="flex items-center gap-2.5 min-w-0 overflow-hidden whitespace-nowrap">
                <ChevronDown size={13} aria-hidden="true" className={`text-fg5 transition-transform duration-100 ${isOpen ? '' : '-rotate-90'}`} />
                <Dot color={dotColor} />
                <span className="text-base text-fg">{stack.name}</span>
                <span className="text-xs text-fg4">{runningCount}/{members.length} running</span>
                <span onClick={(e) => e.stopPropagation()} className="min-w-0 overflow-hidden">
                  <CopyText value={stack.file} colorClass="text-fg5">
                    <span className="text-xs truncate block max-w-[220px]">{stack.file}</span>
                  </CopyText>
                </span>
              </div>
              <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                <StackBtn label="graph"   colorClass="text-blue"  onClick={() => openStackGraph(stack.id)} />
                <StackBtn label="logs"    colorClass="text-fg3"   onClick={() => openStackLogs(stack.id)} />
              </div>
            </div>

            {/* Member containers — bus-line motif (not ASCII tree) */}
            {isOpen && (
              <div className="relative pb-2.5">
                <div className="absolute left-[27px] top-0 bottom-3 w-px bg-border1" aria-hidden="true" />
                {members.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => { selectContainer(c.id); setActiveNav('containers'); }}
                    className="relative flex items-center gap-2.5 pl-11 pr-4 py-1.5 cursor-pointer text-sm hover:bg-hover transition-colors"
                  >
                    <span className="absolute left-[27px] top-1/2 w-2.5 h-px bg-border2" aria-hidden="true" />
                    <StatusDot status={c.status} />
                    <span className="text-fg w-[180px] truncate font-sans font-medium">{c.name}</span>
                    <span className="text-fg4 flex-1 truncate">{c.image}</span>
                    <span className={`text-xs shrink-0 ${statusTextClass[c.status]}`}>{statusWord[c.status]}</span>
                    <span className="text-fg4 text-xs tabular-nums shrink-0 w-[60px] text-right">{c.uptime ?? '—'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
