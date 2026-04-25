import { useEffect } from 'react';
import { CopyText } from '../ui/CopyText';
import { MOCK_COMPOSE } from '../../data/mock';
import type { Stack } from '../../types/docker';

function YamlLine({ line }: { line: string }) {
  if (line.trim() === '' || line.trim().startsWith('#')) {
    return <span className="text-fg5">{line}</span>;
  }
  const m = line.match(/^(\s*)([\w.-]+)(:)(.*)$/);
  if (m) {
    const [, indent, key, , val] = m;
    const trimVal = val.trim();
    let valClass = 'text-fg2';
    if (/^["']/.test(trimVal) || /^\$\{/.test(trimVal)) valClass = 'text-cache-hit';
    else if (/^\d+/.test(trimVal))                        valClass = 'text-blue';
    else if (trimVal === 'true' || trimVal === 'false')    valClass = 'text-amber';
    return (
      <>
        <span>{indent}</span>
        <span className="text-fg">{key}</span>
        <span className="text-fg5">:</span>
        {val && <span className={valClass}>{val}</span>}
      </>
    );
  }
  // List item
  if (/^\s*-\s/.test(line)) {
    const [indent2, ...rest] = line.split(/(-\s)/);
    return (
      <>
        <span>{indent2}</span>
        <span className="text-fg5">- </span>
        <span className="text-fg2">{rest.slice(1).join('')}</span>
      </>
    );
  }
  return <span className="text-fg2">{line}</span>;
}

interface ComposeViewerProps {
  stack: Stack;
  onClose: () => void;
}

export function ComposeViewer({ stack, onClose }: ComposeViewerProps) {
  const yaml  = MOCK_COMPOSE[stack.id] ?? '# compose file not found';
  const lines = yaml.split('\n');

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="flex-1 flex flex-col bg-bg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border1 bg-card shrink-0">
        <div className="flex items-center gap-2.5 whitespace-nowrap">
          <button
            onClick={onClose}
            className="bg-transparent border-none cursor-pointer text-fg4 text-xs px-0 hover:text-fg2 transition-colors"
          >
            ← stacks
          </button>
          <span className="text-fg6 text-xs">/</span>
          <span className="text-sm text-fg">{stack.name}</span>
          <span className="text-xs text-fg4">compose file</span>
        </div>
        <div className="flex items-center gap-2">
          <CopyText value={yaml} colorClass="text-fg4">
            <span className="text-xs">copy to clipboard</span>
          </CopyText>
          <span className="text-xs text-fg5">
            <span className="text-green">$</span> cat {stack.file}
          </span>
          <span className="text-2xs text-fg5 ml-2">esc to close</span>
        </div>
      </div>

      {/* File info bar */}
      <div className="flex items-center gap-2 px-4 py-1.5 border-b border-border1 bg-panel text-xs text-fg4 shrink-0">
        <span className="text-fg5">▤</span>
        <span>{stack.file}</span>
        <span className="text-fg5">·</span>
        <span>{lines.length} lines</span>
        <span className="text-fg5">·</span>
        <span>read-only</span>
      </div>

      {/* YAML content */}
      <div className="flex-1 overflow-auto py-2 bg-bg">
        {lines.map((line, i) => (
          <div
            key={i}
            className="flex px-4 text-sm leading-5 min-h-5"
          >
            <span className="text-fg6 mr-4 shrink-0 select-none w-8 text-right text-xs">{i + 1}</span>
            <YamlLine line={line} />
          </div>
        ))}
      </div>
    </div>
  );
}
