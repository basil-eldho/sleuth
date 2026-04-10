import { useState } from 'react';
import { CopyText } from '../../ui/CopyText';
import { PortLink } from '../../ui/PortLink';
import { DetailBtn } from '../../ui/TopBtn';
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
      <div className="text-2xs tracking-section text-fg5 uppercase pb-2 border-b border-border1 mb-2">
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
      <span className="text-fg5 w-[100px] shrink-0">{k}</span>
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
      <span className="text-fg5 w-[100px] shrink-0">{k}</span>
      <span>{el}</span>
    </div>
  );
}

interface CapFieldProps {
  label: string;
  value: string;
  setValue: (v: string) => void;
  suffix: string;
}

function CapField({ label, value, setValue, suffix }: CapFieldProps) {
  return (
    <label className="flex items-center gap-1.5 text-sm">
      <span className="text-blue">{label}</span>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-[60px] bg-input border border-border3 rounded-sm px-1.5 py-0.5 text-fg text-sm outline-none"
      />
      <span className="text-fg4 text-xs">{suffix}</span>
    </label>
  );
}

interface ResourceEditorProps {
  c: Container;
}

function ResourceEditor({ c }: ResourceEditorProps) {
  const [editing, setEditing] = useState(false);
  const [cpu, setCpu] = useState('1.5');
  const [mem, setMem] = useState(String(c.memLimit));
  const [applied, setApplied] = useState(false);

  if (!editing) {
    return (
      <>
        <RowEl
          k="cpu"
          el={
            <span>
              <span className="text-fg2">{c.cpu.toFixed(1)}%</span>
              <span className="text-fg5"> · cap </span>
              <span className="text-fg2">{cpu} cores</span>
              <button
                onClick={() => setEditing(true)}
                className="bg-transparent border-none text-fg4 text-2xs cursor-pointer pl-2 underline decoration-dotted"
              >
                edit
              </button>
            </span>
          }
        />
        <RowEl
          k="mem"
          el={
            <span>
              <span className={c.mem > c.memLimit ? 'text-red' : 'text-fg2'}>{c.mem} MB</span>
              <span className="text-fg5"> / cap </span>
              <span className="text-fg2">{mem} MB</span>
              <button
                onClick={() => setEditing(true)}
                className="bg-transparent border-none text-fg4 text-2xs cursor-pointer pl-2 underline decoration-dotted"
              >
                edit
              </button>
            </span>
          }
        />
        {applied && (
          <div className="text-2xs text-green mt-0.5 pl-[100px]">
            ✓ applied via docker update — no restart needed
          </div>
        )}
      </>
    );
  }

  return (
    <div className="bg-panel border border-border2 rounded-sm p-3 my-1">
      <div className="text-2xs text-fg5 tracking-widest mb-2">
        DOCKER UPDATE — applies live, no restart
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <CapField label="--cpus" value={cpu} setValue={setCpu} suffix="cores" />
        <CapField label="--memory" value={mem} setValue={setMem} suffix="MB" />
      </div>
      <div className="mt-2 text-xs text-fg3">
        <span className="text-green">$</span>{' '}
        docker update --cpus=<span className="text-fg2">{cpu}</span>{' '}
        --memory=<span className="text-fg2">{mem}m</span> {c.name}
      </div>
      <div className="mt-2 flex gap-1.5 justify-end">
        <DetailBtn onClick={() => setEditing(false)}>cancel</DetailBtn>
        <DetailBtn
          primary
          onClick={() => {
            setApplied(true);
            setEditing(false);
            setTimeout(() => setApplied(false), 2400);
          }}
        >
          ↳ apply
        </DetailBtn>
      </div>
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
        <ResourceEditor c={c} />
        <Row k="restart" v="unless-stopped" />
        <Row k="health"  v={healthLabel} accentClass={healthClass} />
      </Section>

      <Section title="network">
        <RowEl k="ip"      el={<CopyText value={c.ip}>{c.ip}</CopyText>} />
        <RowEl k="ports"   el={<PortLink ports={c.ports} />} />
        <Row   k="network" v={c.stack ? `${c.stack}_default` : 'bridge'} />
        <Row   k="dns"     v="127.0.0.11" />
      </Section>

      <Section title="resource limits">
        <Row k="cpu cap"  v="1.5 cores" />
        <Row k="mem cap"  v={`${c.memLimit} MB`} accentClass={c.mem > c.memLimit ? 'text-red' : undefined} />
        <Row k="pids"     v="1024" />
        <Row k="oom kill" v="enabled" accentClass="text-amber" />
      </Section>

      <Section title="env" full>
        {Object.entries(c.env).map(([k, v]) => (
          <div key={k} className="py-0.5 text-sm leading-[17px]">
            <span className="text-cache-hit">{k}</span>
            <span className="text-fg5">=</span>
            <span className="text-fg2">{v}</span>
          </div>
        ))}
      </Section>
    </div>
  );
}
