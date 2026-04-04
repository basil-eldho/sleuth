import { useEffect, useMemo } from 'react';
import { useContainers } from './hooks/useContainers';
import { useImages } from './hooks/useImages';
import { useNetworks } from './hooks/useNetworks';
import { useVolumes } from './hooks/useVolumes';
import { useStacks } from './hooks/useStacks';
import { useAppStore, type NavSection } from './store';
import { Sidebar } from './components/layout/Sidebar';
import { ViewHeader } from './components/layout/ViewHeader';
import { TopBtn } from './components/ui/TopBtn';
import { StatusDot } from './components/ui/Dot';
import { ContainerTable } from './components/containers/ContainerTable';
import { ContainerDetail } from './components/containers/ContainerDetail';
import { BatchActionBar } from './components/containers/BatchActionBar';
import { ImagesView } from './components/images/ImagesView';
import { ImageDetail } from './components/images/ImageDetail';
import { StacksView } from './components/stacks/StacksView';
import { StackGraph } from './components/stacks/StackGraph';
import { StackLogs } from './components/stacks/StackLogs';
import { NetworksView } from './components/networks/NetworksView';
import { VolumesView } from './components/volumes/VolumesView';
import { PruneDialog } from './components/dialogs/PruneDialog';
import { CommandPalette } from './components/dialogs/CommandPalette';
import { NetworkInspector } from './components/dialogs/NetworkInspector';
import { HelpOverlay } from './components/dialogs/HelpOverlay';
import type { ContainerStatus } from './types/docker';

function StatusChip({ count, label, status }: { count: number; label: string; status: ContainerStatus }) {
  return (
    <span className="flex items-center gap-1 text-xs whitespace-nowrap">
      <StatusDot status={status} size="sm" />
      <span className="text-fg4">
        <span className="text-fg3">{count}</span> {label}
      </span>
    </span>
  );
}

export function App() {
  const activeNav            = useAppStore((s) => s.activeNav);
  const setActiveNav         = useAppStore((s) => s.setActiveNav);
  const clearSubviews        = useAppStore((s) => s.clearSubviews);
  const selectedContainerId   = useAppStore((s) => s.selectedContainerId);
  const selectedImage         = useAppStore((s) => s.selectedImage);
  const selectedStackGraph    = useAppStore((s) => s.selectedStackGraph);
  const selectedStackLogs     = useAppStore((s) => s.selectedStackLogs);
  const openDialog            = useAppStore((s) => s.openDialog);
  const closeDialog           = useAppStore((s) => s.closeDialog);
  const dialogs               = useAppStore((s) => s.dialogs);
  const tweaks                = useAppStore((s) => s.tweaks);
  const filter                = useAppStore((s) => s.filter);
  const setFilter             = useAppStore((s) => s.setFilter);
  const initLiveStats         = useAppStore((s) => s.initLiveStats);
  const liveStats             = useAppStore((s) => s.liveStats);

  const { data: liveContainers = [] } = useContainers();
  const { data: liveImages = [] }     = useImages();
  const { data: liveNetworks = [] }   = useNetworks();
  const { data: liveVolumes = [] }    = useVolumes();
  const { data: liveStacks = [] }     = useStacks();

  useEffect(() => { initLiveStats(); }, [initLiveStats]);

  const q = filter.toLowerCase();

  const allContainers = liveContainers;

  const selectedContainer = useMemo(
    () => selectedContainerId ? (allContainers.find((c) => c.id === selectedContainerId) ?? null) : null,
    [selectedContainerId, allContainers],
  );

  const containers = useMemo(
    () => !q ? allContainers : allContainers.filter((c) => c.name.includes(q) || c.image.includes(q)),
    [q, allContainers],
  );
  const images = useMemo(
    () => !q ? liveImages : liveImages.filter((i) => i.repo.includes(q) || i.tag.includes(q)),
    [q, liveImages],
  );
  const networks = useMemo(
    () => !q ? liveNetworks : liveNetworks.filter((n) => n.name.includes(q) || n.driver.includes(q)),
    [q, liveNetworks],
  );
  const volumes = useMemo(
    () => !q ? liveVolumes : liveVolumes.filter((v) => v.name.includes(q)),
    [q, liveVolumes],
  );
  const stacks = useMemo(
    () => !q ? liveStacks : liveStacks.filter((s) => s.name.includes(q)),
    [q, liveStacks],
  );

  const running = allContainers.filter((c) => c.status === 'running').length;
  const warning = allContainers.filter((c) => c.status === 'warning').length;
  const exited  = allContainers.filter((c) => c.status === 'exited').length;

  const statsValues = useMemo(() => Object.values(liveStats), [liveStats]);
  const totalCpu    = useMemo(() => statsValues.reduce((s, v) => s + v.cpu, 0), [statsValues]);
  const totalMemGb  = useMemo(() => statsValues.reduce((s, v) => s + v.mem, 0) / 1024, [statsValues]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const inField =
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement ||
        document.activeElement instanceof HTMLSelectElement;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openDialog('palette');
        return;
      }
      if (inField) return;
      if (e.key === '?') { e.preventDefault(); openDialog('help'); return; }
      if (e.key === '/') {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('input[placeholder*="filter"]')?.focus();
        return;
      }

      const navMap: Record<string, NavSection> = {
        s: 'stacks', c: 'containers', i: 'images',
        n: 'networks', v: 'volumes',
      };
      const nav = navMap[e.key.toLowerCase()];
      if (nav && !e.metaKey && !e.ctrlKey) {
        setActiveNav(nav);
        clearSubviews();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openDialog, setActiveNav, clearSubviews, setFilter]);

  return (
    <div className="flex flex-col w-full h-screen overflow-hidden bg-bg font-mono text-fg">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 h-9 shrink-0 border-b border-border1 bg-panel">
        <div className="flex items-center gap-4">
          <StatusChip count={running} label="running" status="running" />
          {warning > 0 && <StatusChip count={warning} label="warning" status="warning" />}
          {exited  > 0 && <StatusChip count={exited}  label="stopped" status="exited"  />}
          {statsValues.length > 0 && (
            <span className="text-2xs text-fg3 tracking-wider whitespace-nowrap">
              · cpu {totalCpu.toFixed(1)}% · mem {totalMemGb.toFixed(1)} GB
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <TopBtn onClick={() => openDialog('palette')}>⌘K</TopBtn>
          {!tweaks.headerCollapsed && (
            <>
              <TopBtn onClick={() => openDialog('inspector')}>⇄ probe</TopBtn>
              <TopBtn onClick={() => openDialog('prune')}>⌫ reclaim</TopBtn>
            </>
          )}
          <TopBtn onClick={() => openDialog('help')}>?</TopBtn>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 flex flex-col overflow-hidden">

          {/* CONTAINERS — table view */}
          {activeNav === 'containers' && !selectedContainer && (
            <>
              {tweaks.showCmdEcho && (
                <ViewHeader
                  command={`docker ps${q ? ` | grep ${q}` : ''}`}
                  count={containers.length}
                  total={allContainers.length}
                />
              )}
              <ContainerTable containers={containers} />
              <BatchActionBar />
            </>
          )}

          {/* CONTAINERS — detail view */}
          {activeNav === 'containers' && selectedContainer && (
            <ContainerDetail container={selectedContainer} onClose={clearSubviews} />
          )}

          {/* IMAGES — list view */}
          {activeNav === 'images' && !selectedImage && (
            <>
              {tweaks.showCmdEcho && (
                <ViewHeader command="docker images" count={images.length} total={liveImages.length}
                  extra={<TopBtn onClick={() => openDialog('prune')}>prune</TopBtn>}
                />
              )}
              <ImagesView images={images} />
            </>
          )}

          {/* IMAGES — detail view */}
          {activeNav === 'images' && selectedImage && (
            <ImageDetail image={selectedImage} onClose={clearSubviews} />
          )}

          {/* STACKS — list view */}
          {activeNav === 'stacks' && !selectedStackGraph && !selectedStackLogs && (
            <>
              {tweaks.showCmdEcho && (
                <ViewHeader command="docker compose ls" count={stacks.length} total={liveStacks.length}
                />
              )}
              <StacksView stacks={stacks} containers={allContainers} />
            </>
          )}
          {activeNav === 'stacks' && selectedStackGraph && (() => {
            const s = liveStacks.find((s) => s.id === selectedStackGraph);
            return s ? <StackGraph stack={s} onClose={() => useAppStore.setState({ selectedStackGraph: null })} /> : null;
          })()}
          {activeNav === 'stacks' && selectedStackLogs && (() => {
            const s = liveStacks.find((s) => s.id === selectedStackLogs);
            return s ? <StackLogs stack={s} onClose={() => useAppStore.setState({ selectedStackLogs: null })} /> : null;
          })()}

          {/* NETWORKS */}
          {activeNav === 'networks' && (
            <>
              {tweaks.showCmdEcho && (
                <ViewHeader command="docker network ls" count={networks.length} total={liveNetworks.length}
                  extra={<TopBtn onClick={() => openDialog('inspector')}>⇄ probe reach</TopBtn>}
                />
              )}
              <NetworksView networks={networks} />
            </>
          )}

          {/* VOLUMES */}
          {activeNav === 'volumes' && (
            <>
              {tweaks.showCmdEcho && (
                <ViewHeader command="docker volume ls" count={volumes.length} total={liveVolumes.length}
                  extra={<TopBtn onClick={() => openDialog('prune')}>prune orphans</TopBtn>}
                />
              )}
              <VolumesView volumes={volumes} />
            </>
          )}


        </main>
      </div>

      {/* Dialogs */}
      {dialogs.palette   && <CommandPalette   onClose={() => closeDialog('palette')}   />}
      {dialogs.inspector && <NetworkInspector onClose={() => closeDialog('inspector')} />}
      {dialogs.prune     && <PruneDialog      onClose={() => closeDialog('prune')}     />}
      {dialogs.help      && <HelpOverlay      onClose={() => closeDialog('help')}      />}
    </div>
  );
}
