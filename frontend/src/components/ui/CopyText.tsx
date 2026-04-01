import { useState } from 'react';

interface CopyTextProps {
  value: string;
  colorClass?: string; // Tailwind text class, defaults to 'text-fg2'
  children: React.ReactNode;
}

export function CopyText({ value, colorClass = 'text-fg2', children }: CopyTextProps) {
  const [copied, setCopied] = useState(false);

  function copy(e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard?.writeText(value).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 900);
  }

  return (
    <span
      onClick={copy}
      title={copied ? 'copied' : `click to copy · ${value}`}
      className={[
        'cursor-pointer font-mono border-b border-transparent transition-colors',
        copied ? 'text-green' : `${colorClass} hover:text-fg hover:border-b-fg5`,
      ].join(' ')}
    >
      {copied ? '✓ copied' : children}
    </span>
  );
}
