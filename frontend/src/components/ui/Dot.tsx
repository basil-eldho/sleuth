import type { ContainerStatus } from '../../types/docker';

export type DotColor = 'green' | 'amber' | 'red' | 'blue' | 'warm' | 'fg3' | 'fg4' | 'fg5' | 'fg6';

const bgClass: Record<DotColor, string> = {
  green: 'bg-green', amber: 'bg-amber', red: 'bg-red',
  blue:  'bg-blue',  warm:  'bg-warm',
  fg3:   'bg-fg3',   fg4:   'bg-fg4',   fg5: 'bg-fg5', fg6: 'bg-fg6',
};

interface DotProps {
  color: DotColor;
  size?: 'sm' | 'md';
}

export function Dot({ color, size = 'md' }: DotProps) {
  return (
    <span className={`${bgClass[color]} ${size === 'sm' ? 'w-1 h-1' : 'w-1.5 h-1.5'} inline-block shrink-0 rounded-full`} />
  );
}

const statusDotColor: Record<ContainerStatus, DotColor> = {
  running: 'green',
  warning: 'amber',
  exited:  'red',
};

interface StatusDotProps {
  status: ContainerStatus;
  size?: 'sm' | 'md';
}

export function StatusDot({ status, size }: StatusDotProps) {
  return <Dot color={statusDotColor[status]} size={size} />;
}
