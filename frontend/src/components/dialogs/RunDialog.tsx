import { useState, useMemo } from 'react';
import { Modal, ModalHeader } from '../ui/Modal';
import { DetailBtn } from '../ui/TopBtn';
import { IMAGES, HOST_PORTS } from '../../data/mock';

const INPUT_CLASS = 'w-full bg-input border border-border3 rounded-sm px-2 py-1 text-fg text-sm outline-none box-border';

interface FieldProps {
  label: string;
  hint?: string;
  children: React.ReactNode;
}

function Field({ label, hint, children }: FieldProps) {
  return (
    <div className="mb-3">
      <div className="flex justify-between items-baseline mb-1">
        <label className="text-2xs text-fg4 tracking-widest uppercase">{label}</label>
        {hint && <span className="text-2xs text-fg5">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

interface KVRow {
  k: string;
  v: string;
}

interface KVEditorProps {
  label: string;
  rows: KVRow[];
  setRows: (rows: KVRow[]) => void;
  kPlaceholder: string;
  vPlaceholder: string;
  sep: string;
  kWarn?: (k: string) => string | null;
}

function KVEditor({ label, rows, setRows, kPlaceholder, vPlaceholder, sep, kWarn }: KVEditorProps) {
  function update(i: number, key: 'k' | 'v', val: string) {
    const next = rows.map((r, idx) => idx === i ? { ...r, [key]: val } : r);
    if (i === rows.length - 1 && val) next.push({ k: '', v: '' });
    setRows(next);
  }
  function remove(i: number) {
    const next = rows.filter((_, idx) => idx !== i);
    setRows(next.length ? next : [{ k: '', v: '' }]);
  }
  return (
    <div className="mb-3">
      <label className="block text-2xs text-fg4 tracking-widest uppercase mb-1">{label}</label>
      {rows.map((r, i) => {
        const warn = kWarn && r.k ? kWarn(r.k) : null;
        return (
          <div key={i} className="mb-1">
            <div className="flex items-center gap-1.5">
              <input
                value={r.k}
                onChange={(e) => update(i, 'k', e.target.value)}
                placeholder={kPlaceholder}
                className={`flex-1 bg-input rounded-sm px-2 py-1 text-fg text-sm outline-none border ${warn ? 'border-danger-border' : 'border-border3'}`}
              />
              <span className="text-fg5 text-sm">{sep}</span>
              <input
                value={r.v}
                onChange={(e) => update(i, 'v', e.target.value)}
                placeholder={vPlaceholder}
                className="flex-1 bg-input border border-border3 rounded-sm px-2 py-1 text-fg text-sm outline-none"
              />
              <button
                onClick={() => remove(i)}
                disabled={!r.k && !r.v && rows.length === 1}
                className="bg-transparent border-none text-fg5 text-sm cursor-pointer px-1.5 disabled:opacity-30"
              >✕</button>
            </div>
            {warn && <div className="text-xs text-red mt-0.5 pl-0.5">⚠ {warn}</div>}
          </div>
        );
      })}
    </div>
  );
}

interface ToggleProps {
  label: string;
  on: boolean;
  onChange: (v: boolean) => void;
}

function Toggle({ label, on, onChange }: ToggleProps) {
  return (
    <button
      onClick={() => onChange(!on)}
      className="bg-transparent border-none cursor-pointer flex items-center gap-1.5 text-sm px-0"
      style={{ color: on ? 'var(--color-fg)' : 'var(--color-fg4)' }}
    >
      <span className={on ? 'text-green' : 'text-fg5'}>{on ? '●' : '○'}</span>
      {label}
    </button>
  );
}

interface RunDialogProps {
  onClose: () => void;
}

export function RunDialog({ onClose }: RunDialogProps) {
  const [image,   setImage]   = useState(`${IMAGES[0].repo}:${IMAGES[0].tag}`);
  const [name,    setName]    = useState('');
  const [ports,   setPorts]   = useState<KVRow[]>([{ k: '', v: '' }]);
  const [env,     setEnv]     = useState<KVRow[]>([{ k: '', v: '' }]);
  const [vols,    setVols]    = useState<KVRow[]>([{ k: '', v: '' }]);
  const [network, setNetwork] = useState('myapp_default');
  const [restart, setRestart] = useState('unless-stopped');
  const [detach,  setDetach]  = useState(true);
  const [tty,     setTty]     = useState(false);

  const command = useMemo(() => {
    const parts = ['docker run'];
    if (detach) parts.push('-d');
    if (tty)    parts.push('-it');
    if (name)   parts.push(`--name ${name}`);
    if (network) parts.push(`--network ${network}`);
    if (restart) parts.push(`--restart ${restart}`);
    ports.filter((p) => p.k && p.v).forEach((p) => parts.push(`-p ${p.k}:${p.v}`));
    env.filter((e) => e.k).forEach((e) => parts.push(`-e ${e.k}=${e.v}`));
    vols.filter((v) => v.k && v.v).forEach((v) => parts.push(`-v ${v.k}:${v.v}`));
    parts.push(image);
    return parts.join(' ');
  }, [image, name, ports, env, vols, network, restart, detach, tty]);

  return (
    <Modal onClose={onClose} size="lg">
      <ModalHeader command="docker run" />
      <div className="px-4 py-4 overflow-auto flex-1">
        <Field label="image">
          <select value={image} onChange={(e) => setImage(e.target.value)} className={INPUT_CLASS}>
            {IMAGES.map((img) => (
              <option key={img.id} value={`${img.repo}:${img.tag}`}>
                {img.repo}:{img.tag} · {img.size}
              </option>
            ))}
          </select>
        </Field>

        <Field label="name" hint="leave blank for auto-generated">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="my-container"
            className={INPUT_CLASS}
          />
        </Field>

        <KVEditor
          label="ports"
          rows={ports}
          setRows={setPorts}
          kPlaceholder="host"
          vPlaceholder="container"
          sep="→"
          kWarn={(host) => {
            const c = HOST_PORTS.find((p) => String(p.port) === host.trim());
            return c ? `:${c.port} in use by pid ${c.pid} (${c.process})` : null;
          }}
        />

        <KVEditor label="env"     rows={env}  setRows={setEnv}  kPlaceholder="KEY"        vPlaceholder="value"           sep="=" />
        <KVEditor label="volumes" rows={vols} setRows={setVols} kPlaceholder="/host/path" vPlaceholder="/container/path" sep="↔" />

        <div className="grid gap-4 mb-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <Field label="network">
            <input value={network} onChange={(e) => setNetwork(e.target.value)} className={INPUT_CLASS} />
          </Field>
          <Field label="restart">
            <select value={restart} onChange={(e) => setRestart(e.target.value)} className={INPUT_CLASS}>
              {['no', 'on-failure', 'unless-stopped', 'always'].map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="flex gap-4">
          <Toggle label="-d  detach" on={detach} onChange={setDetach} />
          <Toggle label="-it tty"    on={tty}    onChange={setTty}    />
        </div>
      </div>

      <div className="border-t border-border1 bg-panel px-4 py-2.5 shrink-0">
        <div className="text-2xs text-fg5 tracking-widest mb-1">WILL EXECUTE</div>
        <div className="text-sm text-fg2 max-h-[60px] overflow-auto pb-2.5 break-all">
          <span className="text-green">$</span> {command}
        </div>
        <div className="flex justify-end gap-1.5">
          <DetailBtn onClick={onClose}>cancel</DetailBtn>
          <DetailBtn primary onClick={onClose}>▶ run</DetailBtn>
        </div>
      </div>
    </Modal>
  );
}
