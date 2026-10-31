import { Search } from 'lucide-react';
import { useAppStore } from '../../store';

interface ViewHeaderProps {
  title: string;
  count: number;
  total: number;
  subtitle?: string;
  extra?: React.ReactNode;
}

export function ViewHeader({ title, count, total, subtitle, extra }: ViewHeaderProps) {
  const filter = useAppStore((s) => s.filter);
  const setFilter = useAppStore((s) => s.setFilter);

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border1 shrink-0 font-sans">
      <h1 className="text-xl font-semibold text-fg tracking-tight">{title}</h1>
      <span className="text-xs text-fg4 font-mono tabular-nums">
        {subtitle ?? (count === total ? `${total}` : `${count} of ${total}`)}
      </span>

      <span className="flex-1" />

      <div className="flex items-center gap-2 bg-input border border-border2 rounded-sm px-2.5 py-1.5 w-56 max-w-[42vw] focus-within:border-accent-border transition-colors">
        <Search size={13} className="text-fg5 shrink-0" />
        <input
          name={`${title.toLowerCase()}-filter`}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="filter…"
          aria-label={`Filter ${title.toLowerCase()}`}
          className="bg-transparent border-none outline-none text-fg font-mono text-xs w-full placeholder:text-fg5"
        />
        <span className="text-2xs text-fg6 border border-border2 rounded-sm px-1 shrink-0">/</span>
      </div>

      {extra && <div className="flex gap-1.5 shrink-0">{extra}</div>}
    </div>
  );
}
