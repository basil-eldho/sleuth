import { useState } from 'react';

interface PortChipProps {
  raw: string;
}

function PortChip({ raw }: PortChipProps) {
  const [hov, setHov] = useState(false);
  const segments = raw.split(':');
  const hostPort = segments.length === 3 ? segments[1] : segments[0];
  const containerPort = segments[segments.length - 1];
  const href = hostPort === '443' ? `https://localhost:${hostPort}` : `http://localhost:${hostPort}`;

  function open(e: React.MouseEvent) {
    e.stopPropagation();
    window.open(href, '_blank');
  }

  return (
    <span
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="inline-flex items-center gap-1 text-sm whitespace-nowrap"
    >
      <span
        onClick={open}
        title={`open ${href} in browser`}
        className={`cursor-pointer border-b border-transparent transition-colors duration-100 ${hov ? 'text-green border-b-green' : 'text-fg2'}`}
      >
        :{hostPort}
      </span>
      <span className="text-fg4 text-2xs">→</span>
      <span className="text-fg3 text-xs">{containerPort}</span>
      {hov && (
        <span
          onClick={open}
          className="text-green text-2xs cursor-pointer bg-green/10 px-1 rounded-sm tracking-port"
        >
          ↗ open
        </span>
      )}
    </span>
  );
}

interface PortLinkProps {
  ports: string | null;
}

export function PortLink({ ports }: PortLinkProps) {
  if (!ports) return <span className="text-fg6 text-sm">—</span>;

  const parts = ports.split(',').map((p) => p.trim());
  return (
    <span className="flex gap-1.5 flex-wrap items-center">
      {parts.map((p, i) => <PortChip key={i} raw={p} />)}
    </span>
  );
}
