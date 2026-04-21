import { useState } from 'react';
import { Modal, ModalHeader } from '../ui/Modal';
import { DetailBtn } from '../ui/TopBtn';
import { Dot } from '../ui/Dot';
import { useContainers } from '../../hooks/useContainers';

const INPUT_CLASS = 'w-full bg-input border border-border3 rounded-sm px-2 py-1 text-fg text-sm outline-none';

interface FieldProps {
  label: string;
  children: React.ReactNode;
}

function Field({ label, children }: FieldProps) {
  return (
    <div>
      <div className="text-2xs text-fg4 tracking-widest uppercase mb-1">{label}</div>
      {children}
    </div>
  );
}

interface ProbeResult {
  ok: boolean;
  latencyMs: number;
  lines: string[];
}

interface NetworkInspectorProps {
  onClose: () => void;
}

export function NetworkInspector({ onClose }: NetworkInspectorProps) {
  const { data: containers = [] } = useContainers();
  const running = containers.filter((c) => c.status !== 'exited');
  const [from, setFrom]   = useState(running[0]?.id ?? '');
  const [to, setTo]       = useState(running[1]?.id ?? '');
  const [port, setPort]   = useState('5432');
  const [busy, setBusy]   = useState(false);
  const [result, setResult] = useState<ProbeResult | null>(null);

  function probe() {
    setBusy(true);
    setResult(null);
    const tc = containers.find((c) => c.id === to);
    setTimeout(() => {
      const ok  = !!tc && tc.status === 'running' && Math.random() > 0.15;
      const lat = +(Math.random() * 4 + 0.4).toFixed(1);
      setResult({
        ok,
        latencyMs: lat,
        lines: ok
          ? [`connecting to ${tc?.ip ?? '?'}:${port}...`, 'connection succeeded', `round-trip: ${lat} ms`]
          : [`connecting to ${tc?.ip ?? '?'}:${port}...`, `nc: connect failed: Connection refused`, `hint: check ${to} is listening and on the same network`],
      });
      setBusy(false);
    }, 600);
  }

  const fc = containers.find((c) => c.id === from);
  const tc = containers.find((c) => c.id === to);
  const sameNet = fc && tc && fc.stack === tc.stack;

  return (
    <Modal onClose={onClose} size="lg">
      <ModalHeader command="docker exec ... nc -zv" />
      <div className="px-4 py-3.5">
        <div className="grid gap-2 items-end" style={{ gridTemplateColumns: '1fr 20px 1fr 80px' }}>
          <Field label="from">
            <select value={from} onChange={(e) => setFrom(e.target.value)} className={INPUT_CLASS}>
              {running.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
          <div className="text-fg5 text-base text-center pb-2">→</div>
          <Field label="to">
            <select value={to} onChange={(e) => setTo(e.target.value)} className={INPUT_CLASS}>
              {containers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="port">
            <input value={port} onChange={(e) => setPort(e.target.value)} className={INPUT_CLASS} />
          </Field>
        </div>

        {fc && tc && (
          <div className="mt-2.5 px-2.5 py-1.5 bg-panel rounded-sm text-xs text-fg3">
            {fc.ip} <span className="text-fg5">→</span> {tc.ip}:{port} ·
            <span className={`ml-1.5 ${sameNet ? 'text-cache-hit' : 'text-amber'}`}>
              {sameNet ? `same network (${fc.stack ?? 'default'})` : '⚠ different stacks — may need shared network'}
            </span>
          </div>
        )}

        <div className="mt-3 flex justify-end">
          <DetailBtn primary onClick={probe}>{busy ? '· probing...' : '▶ probe'}</DetailBtn>
        </div>
      </div>

      {result && (
        <div className="border-t border-border1 px-4 py-3 bg-panel">
          <div className="flex items-center gap-2 mb-2">
            <Dot color={result.ok ? 'green' : 'red'} />
            <span className={`text-sm ${result.ok ? 'text-green' : 'text-red'}`}>
              [{result.ok ? 'reachable' : 'unreachable'}]
            </span>
            {result.ok && <span className="text-xs text-fg3">{result.latencyMs} ms rtt</span>}
          </div>
          <div className="bg-bg border border-border2 rounded-sm px-2.5 py-2 text-xs text-fg2 leading-[17px]">
            {result.lines.map((l, i) => (
              <div
                key={i}
                className={
                  l.includes('refused') || l.includes('failed') ? 'text-red'
                  : l.startsWith('hint:')                        ? 'text-amber'
                  : l.includes('succeeded')                      ? 'text-green'
                  : 'text-fg2'
                }
              >
                {l}
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
