import { useEffect, useMemo } from 'react';
import { UsedByTab } from './tabs/UsedByTab';
import { CopyText } from '../ui/CopyText';
import { useContainers } from '../../hooks/useContainers';
import type { Image } from '../../types/docker';

interface DetailSectionProps {
  title: string;
  children: React.ReactNode;
}

function DetailSection({ title, children }: DetailSectionProps) {
  return (
    <div className="mb-5">
      <div className="text-2xs tracking-section text-fg5 uppercase pb-2 border-b border-border1 mb-2">
        {title}
      </div>
      {children}
    </div>
  );
}

interface DetailRowProps {
  k: string;
  v: string;
  accentClass?: string;
}

function DetailRow({ k, v, accentClass }: DetailRowProps) {
  return (
    <div className="flex py-0.5 text-sm leading-[17px]">
      <span className="text-fg5 w-[90px] shrink-0">{k}</span>
      <span className={`${accentClass ?? 'text-fg2'} overflow-hidden text-ellipsis`}>{v}</span>
    </div>
  );
}

interface ImageDetailProps {
  image: Image;
  onClose: () => void;
}

export function ImageDetail({ image, onClose }: ImageDetailProps) {
  const { data: containers = [] } = useContainers();
  const usedBy = useMemo(
    () => containers.filter((c) => c.image === `${image.repo}:${image.tag}`).map((c) => c.name),
    [containers, image.repo, image.tag],
  );
  const shortId = image.id.replace('sha256:', '').slice(0, 12);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="flex-1 flex flex-col bg-bg overflow-hidden">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border1 bg-card shrink-0">
        <div className="flex items-center gap-2.5 min-w-0 overflow-hidden whitespace-nowrap">
          <button
            onClick={onClose}
            className="bg-transparent border-none cursor-pointer text-fg4 text-xs px-0 hover:text-fg2 transition-colors"
          >
            ← images
          </button>
          <span className="text-fg6 text-xs">/</span>
          <span className="text-sm text-fg">{image.repo}</span>
          <span className="bg-input px-2 py-px rounded-sm text-fg3 text-xs border border-border3">
            {image.tag}
          </span>
          <span className="text-xs">
            <CopyText value={image.id} colorClass="text-fg5">{shortId}</CopyText>
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-2xs text-fg5">esc to close</span>
        </div>
      </div>

      {/* Command echo */}
      <div className="flex items-center px-4 py-1.5 border-b border-border1 bg-panel text-xs text-fg5 shrink-0">
        <span className="text-green">$</span>&nbsp;docker image inspect {image.repo}:{image.tag}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto p-5">
        <DetailSection title="overview">
          <DetailRow k="repository" v={image.repo} />
          <DetailRow k="tag"        v={image.tag} />
          <DetailRow k="image id"   v={image.id} />
          <DetailRow k="created"    v={image.created} />
          <DetailRow k="total size" v={image.size} />
          <DetailRow
            k="in use"
            v={image.inUse ? 'yes' : 'no'}
            accentClass={image.inUse ? 'text-green' : 'text-amber'}
          />
        </DetailSection>

        <DetailSection title={`used by · ${usedBy.length} containers`}>
          <UsedByTab containerNames={usedBy} />
        </DetailSection>
      </div>
    </div>
  );
}
