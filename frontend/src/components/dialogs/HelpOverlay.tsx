import { Modal, ModalHeader } from '../ui/Modal';

const SHORTCUTS = [
  { k: '⌘K',            v: 'open command palette' },
  { k: '/',             v: 'focus filter' },
  { k: 'S C I N V',    v: 'jump to stacks / containers / images / networks / volumes' },
  { k: '1-6',           v: 'switch tabs in container detail' },
  { k: 'esc',           v: 'close detail / dialog' },
  { k: '?',             v: 'show this help' },
] as const;

interface HelpOverlayProps {
  onClose: () => void;
}

export function HelpOverlay({ onClose }: HelpOverlayProps) {
  return (
    <Modal onClose={onClose} size="md">
      <ModalHeader command="man sleuth" />
      <div className="px-4 py-4 overflow-auto">
        <div className="text-sm text-fg2 mb-3.5">
          sleuth is keyboard-first. you almost never need the mouse.
        </div>
        <div className="grid gap-x-4 gap-y-2" style={{ gridTemplateColumns: '160px 1fr' }}>
          {SHORTCUTS.map((r) => (
            <div key={r.k} className="contents">
              <div className="text-sm text-green">{r.k}</div>
              <div className="text-sm text-fg2">{r.v}</div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
