import { useEffect } from 'react';

export type ModalSize = 'sm' | 'md' | 'lg';

const sizeClass: Record<ModalSize, string> = {
  sm: 'w-[420px]',
  md: 'w-[560px]',
  lg: 'w-[680px]',
};

interface ModalProps {
  onClose: () => void;
  size?: ModalSize;
  align?: 'center' | 'top';
  children: React.ReactNode;
}

export function Modal({ onClose, size = 'md', align = 'center', children }: ModalProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      className={[
        'fixed inset-0 bg-black/55 flex justify-center z-[100]',
        align === 'top' ? 'items-start pt-[12vh]' : 'items-center',
      ].join(' ')}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`${sizeClass[size]} bg-bg border border-border2 rounded font-mono shadow-2xl max-h-[78vh] flex flex-col`}
      >
        {children}
      </div>
    </div>
  );
}

interface ModalHeaderProps {
  command: string;
  right?: React.ReactNode;
}

export function ModalHeader({ command, right }: ModalHeaderProps) {
  return (
    <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border1 bg-panel shrink-0">
      <span className="text-sm text-fg3">
        <span className="text-green">$</span> {command}
      </span>
      {right ?? <span className="text-2xs text-fg5 tracking-wider">esc</span>}
    </div>
  );
}
