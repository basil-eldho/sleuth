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
  // A real-data subset of `docker inspect` assembled from the inspect DTO —
  // every field below comes from the backend, nothing is fabricated.
  const json = {
    Id: c.id,
    Name: '/' + c.name,
    Created: c.created,
    State: {
      Status: c.status,
      Running: c.status !== 'exited',
      Health: c.health || undefined,
      ExitCode: c.status === 'exited' ? (c.exitInfo?.code ?? 0) : 0,
      Uptime: c.uptime ?? undefined,
    },
    Image: c.image,
    NetworkSettings: { IPAddress: c.ip, Network: c.network || undefined, Ports: c.ports },
    Config: { Env: Object.entries(c.env).map(([k, v]) => `${k}=${v}`) },
    HostConfig: {
      Memory: c.memLimit > 0 ? Math.round(c.memLimit * 1024 * 1024) : 0,
      NanoCpus: c.cpuCap ? Math.round(c.cpuCap * 1e9) : 0,
      PidsLimit: c.pidsLimit ?? 0,
      OomKillDisable: c.oomKill === false,
      RestartPolicy: { Name: c.restartPolicy || '' },
      Dns: c.dns && c.dns !== '—' ? c.dns.split(', ') : [],
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
