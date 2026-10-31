import { Radar, Box, Layers, Network, Share2, Database, type LucideIcon } from 'lucide-react';
import { useAppStore, type NavSection } from '../../store';
import { useContainers } from '../../hooks/useContainers';
import { useImages } from '../../hooks/useImages';
import { useNetworks } from '../../hooks/useNetworks';
import { useVolumes } from '../../hooks/useVolumes';
import { useStacks } from '../../hooks/useStacks';
import { useDiskUsage } from '../../hooks/useDiskUsage';

interface NavItem {
  id: NavSection;
  label: string;
  Icon: LucideIcon;
  count: string;
}

function toBytes(s: string): number {
  const m = s.match(/([\d.]+)\s*(B|KB|MB|GB|TB)/i);
  if (!m) return 0;
  const mult: Record<string, number> = { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4 };
  return parseFloat(m[1]) * (mult[m[2].toUpperCase()] ?? 1);
}

function DiskRow({ label, size, warn }: { label: string; size: string; warn?: boolean }) {
  return (
    <div className="flex justify-between py-px text-2xs">
      <span className={warn ? 'text-amber' : 'text-fg5'}>{label}</span>
      <span className="text-fg3 tabular-nums">{size}</span>
    </div>
  );
}

export function Sidebar() {
  const activeNav     = useAppStore((s) => s.activeNav);
  const setActiveNav  = useAppStore((s) => s.setActiveNav);
  const clearSubviews = useAppStore((s) => s.clearSubviews);
  const openDialog    = useAppStore((s) => s.openDialog);

  const { data: containers = [] } = useContainers();
  const { data: images = [] }     = useImages();
  const { data: networks = [] }   = useNetworks();
  const { data: volumes = [] }    = useVolumes();
  const { data: stacks = [] }     = useStacks();
  const { data: diskUsage }       = useDiskUsage();

  const running = containers.filter((c) => c.status === 'running').length;

  const groups: Array<{ title: string; items: NavItem[] }> = [
    { title: 'Workloads', items: [
      { id: 'containers', label: 'Containers', Icon: Box,     count: `${running}/${containers.length}` },
      { id: 'images',     label: 'Images',     Icon: Layers,  count: `${images.length}` },
      { id: 'stacks',     label: 'Stacks',     Icon: Network, count: `${stacks.length}` },
    ]},
    { title: 'Infra', items: [
      { id: 'networks', label: 'Networks', Icon: Share2,   count: `${networks.length}` },
      { id: 'volumes',  label: 'Volumes',  Icon: Database, count: `${volumes.length}` },
    ]},
  ];

  function navigate(nav: NavSection) {
    setActiveNav(nav);
    clearSubviews();
  }

  // Proportional disk bar from the real system-df sizes.
  const segs = diskUsage
    ? [
        { bytes: toBytes(diskUsage.images.size),     cls: 'bg-accent' },
        { bytes: toBytes(diskUsage.volumes.size),    cls: 'bg-warm' },
        { bytes: toBytes(diskUsage.buildCache.size), cls: 'bg-fg5' },
      ]
    : [];
  const segTotal = segs.reduce((n, s) => n + s.bytes, 0) || 1;

  return (
    <aside className="w-52 shrink-0 flex flex-col bg-panel border-r border-border2 font-sans">
      {/* Brand */}
      <div className="flex items-center gap-2.5 h-11 px-4 border-b border-border1">
        <span className="grid place-items-center w-5 h-5 rounded-sm bg-accent-dim border border-accent-border text-accent">
          <Radar size={13} />
        </span>
        <span className="text-base text-fg tracking-brand font-semibold">SLEUTH</span>
        <span className="text-fg5 text-2xs ml-auto font-mono">v0.1</span>
      </div>

      {/* Nav groups */}
      {groups.map((group) => (
        <div key={group.title} className="px-2.5 pt-3 pb-1">
          <div className="px-2 pb-1.5 text-2xs tracking-section uppercase text-fg5 font-semibold">{group.title}</div>
          {group.items.map(({ id, label, Icon, count }) => {
            const active = activeNav === id;
            return (
              <button
                key={id}
                onClick={() => navigate(id)}
                className={[
                  'flex items-center gap-2.5 w-full px-2 py-1.5 rounded-sm text-base font-medium text-left transition-colors',
                  active ? 'bg-active text-fg' : 'text-fg3 hover:bg-hover hover:text-fg',
                ].join(' ')}
              >
                <Icon size={15} className={active ? 'text-accent' : 'text-fg4'} />
                <span>{label}</span>
                <span className={`ml-auto text-2xs font-mono tabular-nums ${active ? 'text-fg3' : 'text-fg5'}`}>{count}</span>
              </button>
            );
          })}
        </div>
      ))}

      <div className="flex-1" />

      {/* Disk usage footer */}
      <div
        onClick={() => openDialog('prune')}
        title="reclaim disk space"
        className="border-t border-border1 px-4 pt-3 pb-3 cursor-pointer font-sans"
      >
        <div className="flex justify-between mb-2 text-2xs tracking-label">
          <span className="text-fg4">Disk usage</span>
          <span className="text-fg2 font-mono tabular-nums">{diskUsage?.total ?? '—'}</span>
        </div>
        {diskUsage && (
          <>
            <div className="flex h-[3px] rounded-sm overflow-hidden bg-input mb-2">
              {segs.map((s, i) => (
                <span key={i} className={s.cls} style={{ width: `${(s.bytes / segTotal) * 100}%` }} />
              ))}
            </div>
            <DiskRow label="images"      size={diskUsage.images.size} />
            <DiskRow label="containers"  size={diskUsage.containers.size} />
            <DiskRow label="volumes"     size={diskUsage.volumes.size} warn={diskUsage.volumes.reclaimable !== '0 B' && diskUsage.volumes.reclaimable !== '—'} />
            <DiskRow label="build cache" size={diskUsage.buildCache.size} />
          </>
        )}
      </div>
    </aside>
  );
}
