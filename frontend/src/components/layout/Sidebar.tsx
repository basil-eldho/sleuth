import { useAppStore, type NavSection } from '../../store';
import { Dot } from '../ui/Dot';
import { useContainers } from '../../hooks/useContainers';
import { useImages } from '../../hooks/useImages';
import { useNetworks } from '../../hooks/useNetworks';
import { useVolumes } from '../../hooks/useVolumes';
import { useStacks } from '../../hooks/useStacks';
import { useDiskUsage } from '../../hooks/useDiskUsage';

interface NavItem {
  id: NavSection;
  label: string;
  key: string;
  count: string;
}

function DiskRow({ label, data, warn }: { label: string; data: { size: string; reclaimable: string }; warn?: boolean }) {
  const hasReclaim = data.reclaimable !== '0 B' && data.reclaimable !== '—';
  return (
    <div className="flex justify-between py-px text-2xs">
      <span className={warn && hasReclaim ? 'text-amber' : 'text-fg5'}>{label}</span>
      <span className="text-fg3 tabular-nums">{data.size}</span>
    </div>
  );
}

export function Sidebar() {
  const activeNav = useAppStore((s) => s.activeNav);
  const setActiveNav = useAppStore((s) => s.setActiveNav);
  const clearSubviews = useAppStore((s) => s.clearSubviews);
  const filter = useAppStore((s) => s.filter);
  const setFilter = useAppStore((s) => s.setFilter);
  const openDialog = useAppStore((s) => s.openDialog);

  const { data: containers = [] }  = useContainers();
  const { data: images = [] }      = useImages();
  const { data: networks = [] }    = useNetworks();
  const { data: volumes = [] }     = useVolumes();
  const { data: stacks = [] }      = useStacks();
  const { data: diskUsage }        = useDiskUsage();

  const running = containers.filter((c) => c.status === 'running').length;

  const items: NavItem[] = [
    { id: 'stacks',     label: 'stacks',     key: 'S', count: `${stacks.length}` },
    { id: 'containers', label: 'containers', key: 'C', count: `${running}/${containers.length}` },
    { id: 'images',     label: 'images',     key: 'I', count: `${images.length}` },
    { id: 'networks',   label: 'networks',   key: 'N', count: `${networks.length}` },
    { id: 'volumes',    label: 'volumes',    key: 'V', count: `${volumes.length}` },
  ];

  function navigate(nav: NavSection) {
    setActiveNav(nav);
    clearSubviews();
  }

  return (
    <aside className="w-[196px] shrink-0 flex flex-col bg-panel border-r border-border2 font-mono">
      {/* Brand */}
      <div className="flex items-baseline gap-1.5 px-3.5 pt-3.5 pb-3 border-b border-border1">
        <span className="text-green text-lg tracking-label">▸</span>
        <span className="text-fg text-lg tracking-brand font-medium">SLEUTH</span>
        <span className="text-fg4 text-2xs ml-auto">v0.1</span>
      </div>

      {/* Filter */}
      <div className="px-2.5 pt-2.5 pb-2">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="/ filter..."
          className="w-full bg-input border border-border3 rounded-sm px-2 py-1 text-fg2 text-sm outline-none placeholder:text-fg5"
        />
      </div>

      {/* Nav */}
      <nav className="py-1">
        {items.map((item) => {
          const active = activeNav === item.id;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              className={[
                'flex items-center justify-between w-full px-3.5 py-1.5 text-base text-left border-none cursor-pointer font-mono border-l-2',
                active
                  ? 'bg-active border-l-green text-fg'
                  : 'bg-transparent border-l-transparent text-fg3',
              ].join(' ')}
            >
              <span className="flex items-baseline gap-2">
                <span className={`text-2xs ${active ? 'text-fg4' : 'text-fg5'}`}>{item.key}</span>
                <span>{item.label}</span>
              </span>
              <span className={`text-2xs ${active ? 'text-fg3' : 'text-fg4'}`}>{item.count}</span>
            </button>
          );
        })}
      </nav>

      <div className="flex-1" />

      {/* Disk usage footer */}
      <div className="border-t border-border1 text-2xs text-fg4 tracking-label">
        <div
          onClick={() => openDialog('prune')}
          className="px-3.5 pt-2.5 pb-2 border-b border-border1 cursor-pointer"
          title="reclaim disk space"
        >
          <div className="flex justify-between mb-1.5 whitespace-nowrap">
            <span className="text-fg3">system df</span>
            <span className="text-fg2">{diskUsage?.total ?? '—'}</span>
          </div>
          {diskUsage ? (
            <>
              <DiskRow label="img"   data={diskUsage.images} />
              <DiskRow label="ctr"   data={diskUsage.containers} />
              <DiskRow label="vol"   data={diskUsage.volumes} warn />
              <DiskRow label="cache" data={diskUsage.buildCache} />
            </>
          ) : (
            <div className="text-2xs text-fg5 py-1">loading...</div>
          )}
        </div>
        <div className="flex items-center gap-1.5 px-3.5 py-2 whitespace-nowrap">
          <Dot color="green" size="sm" />
          <span>engine 24.0.7 · 14d 6h</span>
        </div>
      </div>
    </aside>
  );
}
