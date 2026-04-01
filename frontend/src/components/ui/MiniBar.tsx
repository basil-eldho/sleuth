interface MiniBarProps {
  value: number;
  max: number;
  colorClass: string; // Tailwind bg class e.g. 'bg-green', 'bg-amber', 'bg-border3'
}

export function MiniBar({ value, max, colorClass }: MiniBarProps) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="w-10 h-bar bg-border2 rounded-sm shrink-0">
      {/* width is a runtime calculation — legitimate inline style */}
      <div style={{ width: `${pct}%` }} className={`h-full rounded-sm ${colorClass}`} />
    </div>
  );
}
