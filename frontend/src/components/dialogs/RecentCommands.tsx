import { Modal, ModalHeader } from '../ui/Modal';
import { ActionIcon } from '../ui/TopBtn';
import { CopyText } from '../ui/CopyText';
import { RECENT_CMDS } from '../../data/mock';

interface RecentCommandsProps {
  onClose: () => void;
}

export function RecentCommands({ onClose }: RecentCommandsProps) {
  return (
    <Modal onClose={onClose} size="lg">
      <ModalHeader command="history | grep docker" />
      <div className="overflow-auto">
        {RECENT_CMDS.map((r) => (
          <div
            key={r.id}
            className="flex items-center gap-2.5 px-4 py-1.5 border-b border-border1 text-sm"
          >
            <span className={`${r.exit === 0 ? 'text-green' : 'text-red'} text-xs w-8`}>
              {r.exit === 0 ? '✓' : `✕${r.exit}`}
            </span>
            <CopyText value={r.cmd}>
              <span className="text-fg2">{r.cmd}</span>
            </CopyText>
            <span className="flex-1" />
            <span className="text-fg4 text-xs shrink-0">{r.ranAt}</span>
            <ActionIcon title="Re-run">↺</ActionIcon>
          </div>
        ))}
      </div>
    </Modal>
  );
}
