// k9s / lazydocker-style keyboard-hint bar pinned to the bottom of the window.
// Only advertises shortcuts that are actually wired up (see App key handler).

function Key({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-sans text-fg2 bg-input border border-border2 rounded-sm px-1 leading-none">
      {children}
    </span>
  );
}

function Hint({ keys, label }: { keys: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {keys} <span>{label}</span>
    </span>
  );
}

export function HintBar() {
  return (
    <div className="flex items-center gap-3 h-6 px-4 shrink-0 bg-panel border-t border-border2 font-sans text-2xs text-fg4">
      <Hint keys={<Key>/</Key>} label="filter" />
      <span className="text-border3">·</span>
      <Hint keys={<><Key>⌘</Key><Key>K</Key></>} label="palette" />
      <span className="text-border3">·</span>
      <Hint keys={<><Key>S</Key><Key>C</Key><Key>I</Key><Key>N</Key><Key>V</Key></>} label="jump to view" />
      <span className="flex-1" />
      <Hint keys={<Key>?</Key>} label="help" />
    </div>
  );
}
