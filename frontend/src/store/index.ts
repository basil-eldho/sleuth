import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Image, LiveStats } from '../types/docker';

export type NavSection = 'containers' | 'images' | 'stacks' | 'networks' | 'volumes';
export type DialogName = 'palette' | 'inspector' | 'prune' | 'help';

export interface Tweaks {
  density: 'compact' | 'comfortable';
  accentGreen: string;
  showCmdEcho: boolean;
  headerCollapsed: boolean;
}

const TWEAK_DEFAULTS: Tweaks = {
  density: 'comfortable',
  accentGreen: '#3dd68c',
  showCmdEcho: true,
  headerCollapsed: false,
};

const DIALOG_DEFAULTS: Record<DialogName, boolean> = {
  palette: false,
  inspector: false,
  prune: false,
  help: false,
};

interface AppStore {
  // Live stats from WS /ws/stats
  liveStats: Record<string, LiveStats>;
  applyStats: (stats: LiveStats) => void;
  initLiveStats: () => void;

  // Navigation
  activeNav: NavSection;
  setActiveNav: (nav: NavSection) => void;

  // Selection
  selectedContainerId: string | null;
  selectedImage: Image | null;
  selectedStackGraph: string | null;
  selectedStackLogs: string | null;
  selectContainer: (id: string) => void;
  selectImage: (img: Image) => void;
  clearSubviews: () => void;

  // Batch selection
  batchSelected: Set<string>;
  toggleBatch: (id: string) => void;
  clearBatch: () => void;

  // Dialogs
  dialogs: Record<DialogName, boolean>;
  openDialog: (name: DialogName) => void;
  closeDialog: (name: DialogName) => void;

  // Filter
  filter: string;
  setFilter: (q: string) => void;

  // Tweaks (persisted)
  tweaks: Tweaks;
  setTweak: <K extends keyof Tweaks>(key: K, value: Tweaks[K]) => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      // Live stats
      liveStats: {},
      applyStats: (stats) =>
        set((s) => ({ liveStats: { ...s.liveStats, [stats.id]: stats } })),
      initLiveStats: () => {
        const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(`${proto}//${window.location.host}/ws/stats`);
        ws.onmessage = (e) => {
          const batch: LiveStats[] = JSON.parse(e.data as string);
          set((s) => {
            const next = { ...s.liveStats };
            for (const stat of batch) next[stat.id] = stat;
            return { liveStats: next };
          });
        };
      },

      // Navigation
      activeNav: 'containers',
      setActiveNav: (nav) => set({ activeNav: nav }),

      // Selection
      selectedContainerId: null,
      selectedImage: null,
      selectedStackGraph: null,
      selectedStackLogs: null,
      selectContainer: (id) =>
        set({ selectedContainerId: id, activeNav: 'containers', selectedImage: null }),
      selectImage: (img) =>
        set({ selectedImage: img, activeNav: 'images' }),
      clearSubviews: () =>
        set({
          selectedContainerId: null,
          selectedImage: null,
          selectedStackGraph: null,
          selectedStackLogs: null,
        }),

      // Batch
      batchSelected: new Set(),
      toggleBatch: (id) =>
        set((s) => {
          const next = new Set(s.batchSelected);
          next.has(id) ? next.delete(id) : next.add(id);
          return { batchSelected: next };
        }),
      clearBatch: () => set({ batchSelected: new Set() }),

      // Dialogs
      dialogs: { ...DIALOG_DEFAULTS },
      openDialog: (name) =>
        set((s) => ({ dialogs: { ...s.dialogs, [name]: true } })),
      closeDialog: (name) =>
        set((s) => ({ dialogs: { ...s.dialogs, [name]: false } })),

      // Filter
      filter: '',
      setFilter: (q) => set({ filter: q }),

      // Tweaks
      tweaks: { ...TWEAK_DEFAULTS },
      setTweak: (key, value) =>
        set((s) => ({ tweaks: { ...s.tweaks, [key]: value } })),
    }),
    {
      name: 'sleuth-store',
      // Only persist tweaks — everything else resets on page load
      partialize: (s) => ({ tweaks: s.tweaks }),
    },
  ),
);
