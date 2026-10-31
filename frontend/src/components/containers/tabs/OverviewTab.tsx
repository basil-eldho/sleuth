import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { CopyText } from '../../ui/CopyText';
import { PortLink } from '../../ui/PortLink';
import type { Container, ContainerStatus } from '../../../types/docker';

const statusTextClass: Record<ContainerStatus, string> = {
  running: 'text-green',
  warning: 'text-amber',
  exited:  'text-red',
};

const statusLabel: Record<ContainerStatus, string> = {
  running: 'running',
  warning: 'unhealthy',
  exited:  'exited',
};

interface OverviewTabProps {
  container: Container;
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
  full?: boolean;
}

function Section({ title, children, full }: SectionProps) {
  return (
    <div className={full ? 'col-span-full' : ''}>
      <div className="text-2xs tracking-section text-fg4 uppercase pb-2 border-b border-border1 mb-2 font-sans font-semibold">
        {title}
      </div>
      {children}
    </div>
  );
}

interface RowProps {
  k: string;
  v: string;
  accentClass?: string;
}

function Row({ k, v, accentClass }: RowProps) {
  return (
    <div className="flex py-0.5 text-sm leading-[17px] whitespace-nowrap">
      <span className="text-fg4 w-[100px] shrink-0 font-sans">{k}</span>
      <span className={accentClass ?? 'text-fg2'}>{v}</span>
    </div>
  );
}

interface RowElProps {
  k: string;
  el: React.ReactNode;
}

function RowEl({ k, el }: RowElProps) {
  return (
    <div className="flex py-0.5 text-sm leading-[17px] whitespace-nowrap">
      <span className="text-fg4 w-[100px] shrink-0 font-sans">{k}</span>
      <span>{el}</span>
    </div>
  );
}

// Keys whose values are credentials — masked until the viewer reveals them.
const SECRET_RE = /(secret|password|passwd|token|credential|private|api[-_]?key|access[-_]?key|[-_]key$|^key$)/i;

function EnvRow({ k, v }: { k: string; v: string }) {
  const secret = SECRET_RE.test(k);
  const [show, setShow] = useState(false);
  return (
    <div className="flex items-start gap-1.5 py-0.5 text-sm leading-[17px]">
      <span className="text-fg3">{k}</span>
      <span className="text-fg5">=</span>
      <span className="text-fg2 break-all min-w-0">
        {secret && !show ? '••••••••••••' : (v || <span className="text-fg6">(empty)</span>)}
      </span>
      {secret && v && (
        <button
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Hide value' : 'Reveal value'}
          className="text-fg5 hover:text-accent transition-colors shrink-0 mt-px cursor-pointer flex"
        >
          {show ? <EyeOff size={12} /> : <Eye size={12} />}
        </button>
      )}
    </div>
  );
}

export function OverviewTab({ container: c }: OverviewTabProps) {
  const healthClass =
    c.status === 'warning' ? 'text-amber'
    : c.status === 'exited' ? 'text-fg4'
    : 'text-green';
  const healthLabel =
    c.status === 'warning' ? 'unhealthy'
    : c.status === 'exited' ? 'n/a'
    : 'healthy';

  return (
    <div className="flex-1 overflow-auto p-5 grid grid-cols-2 gap-6 content-start">
      <Section title="identity">
        <RowEl k="hash"    el={<CopyText value={c.hash}>{c.hash}</CopyText>} />
        <RowEl k="image"   el={<CopyText value={c.image}>{c.image}</CopyText>} />
        <Row   k="created" v={c.created} />
        <Row   k="uptime"  v={c.uptime ?? '—'} />
        <RowEl
          k="stack"
          el={
            c.stack
              ? <CopyText value={c.stack}>{c.stack}</CopyText>
              : <span className="text-fg4">—</span>
          }
        />
      </Section>

      <Section title="runtime">
        <Row k="status"  v={statusLabel[c.status]} accentClass={statusTextClass[c.status]} />
        <Row k="cpu"     v={`${c.cpu.toFixed(1)}%${c.cpuCap ? ` · cap ${c.cpuCap} cores` : ''}`} />
        <Row k="mem"     v={`${c.mem.toFixed(0)} MB${c.memLimit > 0 ? ` / ${c.memLimit.toFixed(0)} MB` : ''}`} accentClass={c.memLimit > 0 && c.mem > c.memLimit ? 'text-red' : undefined} />
        <Row k="restart" v={c.restartPolicy || '—'} />
        <Row k="health"  v={c.health || healthLabel} accentClass={healthClass} />
      </Section>

      <Section title="network">
        <RowEl k="ip"      el={<CopyText value={c.ip}>{c.ip}</CopyText>} />
        <RowEl k="ports"   el={<PortLink ports={c.ports} />} />
        <Row   k="network" v={c.network || '—'} />
        <Row   k="dns"     v={c.dns || '—'} />
      </Section>

      <Section title="resource limits">
        <Row k="cpu cap"  v={c.cpuCap ? `${c.cpuCap} cores` : 'unlimited'} />
        <Row k="mem cap"  v={c.memLimit > 0 ? `${c.memLimit.toFixed(0)} MB` : 'unlimited'} accentClass={c.memLimit > 0 && c.mem > c.memLimit ? 'text-red' : undefined} />
        <Row k="pids"     v={c.pidsLimit ? String(c.pidsLimit) : 'unlimited'} />
        <Row k="oom kill" v={c.oomKill ? 'enabled' : 'disabled'} accentClass={c.oomKill ? undefined : 'text-amber'} />
      </Section>

      <Section title="env" full>
        {Object.entries(c.env).map(([k, v]) => (
          <EnvRow key={k} k={k} v={v} />
        ))}
      </Section>
    </div>
  );
}
