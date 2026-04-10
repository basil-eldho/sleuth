import type { Container } from '../../../types/docker';

function highlightLine(line: string): React.ReactNode {
  const m = line.match(/^(\s*)"([^"]+)":\s*(.*)$/);
  if (m) {
    const valClass = /^"/.test(m[3])
      ? 'text-cache-hit'
      : /^[\d-]/.test(m[3])
        ? 'text-blue'
        : 'text-fg2';
    return (
      <>
        <span>{m[1]}</span>
        <span className="text-fg">"{m[2]}"</span>
        <span className="text-fg5">: </span>
        <span className={valClass}>{m[3]}</span>
      </>
    );
  }
  return <span className="text-fg5">{line}</span>;
}

interface InspectTabProps {
  container: Container;
}

export function InspectTab({ container: c }: InspectTabProps) {
  const json = {
    Id: c.hash,
    Name: '/' + c.name,
    State: {
      Status: c.status,
      Running: c.status === 'running' || c.status === 'warning',
      ExitCode: c.status === 'exited' ? (c.exitInfo?.code ?? 0) : 0,
      StartedAt: '2025-04-30T10:14:22.001Z',
    },
    Image: c.image,
    NetworkSettings: { IPAddress: c.ip, Ports: c.ports },
    Config: { Env: Object.entries(c.env).map(([k, v]) => `${k}=${v}`) },
    HostConfig: {
      Memory: c.memLimit * 1024 * 1024,
      NanoCpus: 1500000000,
      RestartPolicy: { Name: 'unless-stopped' },
    },
  };

  const lines = JSON.stringify(json, null, 2).split('\n');

  return (
    <div className="flex-1 overflow-auto px-4 py-3.5 bg-bg">
      <pre className="m-0 text-sm leading-[17px] text-fg2 whitespace-pre-wrap">
        {lines.map((line, i) => (
          <div key={i}>
            <span className="text-fg6 select-none inline-block w-8 text-right pr-3">{i + 1}</span>
            {highlightLine(line)}
          </div>
        ))}
      </pre>
    </div>
  );
}
