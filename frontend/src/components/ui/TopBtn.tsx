interface TopBtnProps {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
}

export function TopBtn({ children, onClick, active }: TopBtnProps) {
  return (
    <button
      onClick={onClick}
      className={[
        'px-2.5 py-0.5 rounded-sm text-xs tracking-ui cursor-pointer font-mono border transition-colors',
        active
          ? 'bg-active border-fg6 text-fg'
          : 'bg-input border-border3 text-fg3 hover:bg-active hover:border-fg6 hover:text-fg',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

interface DetailBtnProps {
  children: React.ReactNode;
  onClick?: () => void;
  primary?: boolean;
  danger?: boolean;
  disabled?: boolean;
}

export function DetailBtn({ children, onClick, primary, danger, disabled }: DetailBtnProps) {
  if (primary) {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className="px-2.5 py-0.5 rounded-sm text-xs cursor-pointer font-mono border bg-green-dim hover:bg-green-dim-hov border-green-border text-green transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {children}
      </button>
    );
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        'px-2.5 py-0.5 rounded-sm text-xs cursor-pointer font-mono border bg-input border-border3 text-fg3 transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
        danger ? 'hover:border-danger-border hover:text-red' : 'hover:border-fg6 hover:text-fg',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

interface ActionIconProps {
  children: React.ReactNode;
  title?: string;
  onClick?: () => void;
  danger?: boolean;
}

export function ActionIcon({ children, title, onClick, danger }: ActionIconProps) {
  return (
    <button
      title={title}
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      className={[
        'bg-transparent border-none cursor-pointer px-1.5 py-0.5 text-sm font-mono leading-none rounded-sm text-fg5 transition-colors',
        danger ? 'hover:text-red' : 'hover:text-fg',
      ].join(' ')}
    >
      {children}
    </button>
  );
}
