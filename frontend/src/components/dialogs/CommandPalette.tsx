import { useState, useEffect, useMemo, useCallback } from 'react';
import { Modal } from '../ui/Modal';
import { useAppStore, type NavSection } from '../../store';
import { useContainers } from '../../hooks/useContainers';
import { useImages } from '../../hooks/useImages';
import { useStacks } from '../../hooks/useStacks';
import type { ContainerStatus } from '../../types/docker';

const STATUS_COLOR_CLASS: Record<ContainerStatus, string> = {
  running: 'text-green',
  warning: 'text-amber',
  exited:  'text-red',
};

interface PaletteAction {
  type: string;
  nav?: NavSection;
  id?: string;
}

interface PaletteItem {
  id: string;
  group: string;
  label: string;
  hint?: string;
  glyph: string;
  glyphClass: string;
  action: PaletteAction;
}

interface CommandPaletteProps {
  onClose: () => void;
}

export function CommandPalette({ onClose }: CommandPaletteProps) {
  const [q, setQ]           = useState('');
  const [cursor, setCursor] = useState(0);

  const setActiveNav      = useAppStore((s) => s.setActiveNav);
  const clearSubviews     = useAppStore((s) => s.clearSubviews);
  const openDialog        = useAppStore((s) => s.openDialog);
  const selectContainer   = useAppStore((s) => s.selectContainer);

  const { data: containers = [] } = useContainers();
  const { data: images = [] }     = useImages();
  const { data: stacks = [] }     = useStacks();

  const items = useMemo<PaletteItem[]>(() => [
    { id: 'nav-stacks',      group: 'navigate', label: 'go to stacks',           hint: 'S',   glyph: '▸', glyphClass: 'text-fg4',    action: { type: 'nav', nav: 'stacks' } },
    { id: 'nav-containers',  group: 'navigate', label: 'go to containers',       hint: 'C',   glyph: '▸', glyphClass: 'text-fg4',    action: { type: 'nav', nav: 'containers' } },
    { id: 'nav-images',      group: 'navigate', label: 'go to images',           hint: 'I',   glyph: '▸', glyphClass: 'text-fg4',    action: { type: 'nav', nav: 'images' } },
    { id: 'nav-networks',    group: 'navigate', label: 'go to networks',         hint: 'N',   glyph: '▸', glyphClass: 'text-fg4',    action: { type: 'nav', nav: 'networks' } },
    { id: 'nav-volumes',     group: 'navigate', label: 'go to volumes',          hint: 'V',   glyph: '▸', glyphClass: 'text-fg4',    action: { type: 'nav', nav: 'volumes' } },
    { id: 'act-probe',       group: 'action',   label: 'probe network reach',                 glyph: '⇄', glyphClass: 'text-blue',   action: { type: 'probe' } },
    { id: 'act-prune',       group: 'action',   label: 'prune / reclaim space',               glyph: '✕', glyphClass: 'text-amber',  action: { type: 'prune' } },
    ...containers.map((c) => ({
      id: 'c-' + c.id, group: 'container', label: c.name, hint: c.image,
      glyph: '●', glyphClass: STATUS_COLOR_CLASS[c.status],
      action: { type: 'open-container', id: c.id },
    })),
    ...images.map((img) => ({
      id: 'i-' + img.id, group: 'image', label: `${img.repo}:${img.tag}`, hint: img.size,
      glyph: '◆', glyphClass: img.inUse ? 'text-green' : 'text-fg4',
      action: { type: 'nav', nav: 'images' as NavSection },
    })),
    ...stacks.map((s) => ({
      id: 's-' + s.id, group: 'stack', label: s.name, hint: `${s.services.length} services`,
      glyph: '▤', glyphClass: 'text-fg3',
      action: { type: 'nav', nav: 'stacks' as NavSection },
    })),
  ], [containers, images, stacks]);

  const filtered = useMemo(() => {
    const v = q.toLowerCase().trim();
    if (!v) return items.slice(0, 30);
    return items.filter(
      (i) => i.label.toLowerCase().includes(v) || i.hint?.toLowerCase().includes(v) || i.group.includes(v),
    ).slice(0, 50);
  }, [q, items]);

  useEffect(() => setCursor(0), [q]);

  const handleAction = useCallback((action: PaletteAction) => {
    if (action.type === 'nav' && action.nav) {
      setActiveNav(action.nav);
      clearSubviews();
    } else if (action.type === 'probe')   openDialog('inspector');
    else if (action.type === 'prune')     openDialog('prune');
    else if (action.type === 'open-container' && action.id) {
      selectContainer(action.id);
    }
  }, [setActiveNav, clearSubviews, openDialog, selectContainer]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(filtered.length - 1, c + 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(0, c - 1)); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        const it = filtered[cursor];
        if (it) { handleAction(it.action); onClose(); }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [filtered, cursor, handleAction, onClose]);

  const grouped: Array<{ group: string; items: PaletteItem[] }> = [];
  filtered.forEach((it) => {
    const last = grouped[grouped.length - 1];
    if (last && last.group === it.group) last.items.push(it);
    else grouped.push({ group: it.group, items: [it] });
  });

  return (
    <Modal onClose={onClose} size="lg" align="top">
      <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-border1 bg-panel shrink-0">
        <span className="text-green text-lg">:</span>
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="search containers, images, actions..."
          className="flex-1 bg-transparent border-none outline-none text-fg text-base"
        />
        <span className="text-2xs text-fg5 tracking-status">↑↓ ↵</span>
      </div>

      <div className="max-h-[460px] overflow-y-auto py-1">
        {grouped.length === 0 && (
          <div className="py-5 text-center text-sm text-fg5">no matches</div>
        )}
        {grouped.map((g) => (
          <div key={g.group}>
            <div className="px-3.5 pt-2 pb-1 text-2xs tracking-section text-fg5 uppercase">
              {g.group}
            </div>
            {g.items.map((it) => {
              const idx    = filtered.indexOf(it);
              const active = idx === cursor;
              return (
                <div
                  key={it.id}
                  onClick={() => { handleAction(it.action); onClose(); }}
                  onMouseEnter={() => setCursor(idx)}
                  className={[
                    'flex items-center gap-2.5 px-3.5 py-1.5 cursor-pointer border-l-2 whitespace-nowrap overflow-hidden transition-colors',
                    active ? 'bg-active border-l-green' : 'bg-transparent border-l-transparent',
                  ].join(' ')}
                >
                  <span className={`${it.glyphClass} text-xs w-3 text-center shrink-0`}>{it.glyph}</span>
                  <span className={`text-base flex-1 overflow-hidden text-ellipsis ${active ? 'text-fg' : 'text-fg2'}`}>
                    {it.label}
                  </span>
                  {it.hint && (
                    <span className="text-xs text-fg4 shrink-0 overflow-hidden text-ellipsis max-w-[220px]">
                      {it.hint}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </Modal>
  );
}
