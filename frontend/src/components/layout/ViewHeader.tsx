interface ViewHeaderProps {
  command: string;
  count: number;
  total: number;
  extra?: React.ReactNode;
}

export function ViewHeader({ command, count, total, extra }: ViewHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-border1 bg-card shrink-0">
      <div className="flex items-baseline gap-3 whitespace-nowrap overflow-hidden">
        <span className="text-sm text-fg">
          <span className="text-green">$</span> {command}
        </span>
        <span className="text-xs text-fg4">
          {count === total ? total : `${count}/${total}`}
        </span>
      </div>
      {extra && <div className="flex gap-1.5 shrink-0">{extra}</div>}
    </div>
  );
}
