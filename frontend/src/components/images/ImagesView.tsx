import { useState, useCallback, memo } from 'react';
import { useAppStore } from '../../store';
import { ActionIcon } from '../ui/TopBtn';
import type { Image } from '../../types/docker';

const TH = 'px-3 py-2 text-left text-2xs tracking-widest text-fg5 font-medium bg-bg sticky top-0 z-[1] border-b border-border2 whitespace-nowrap' as const;

interface ImageRowProps {
  image: Image;
  hovered: boolean;
  onSelect: (img: Image) => void;
  onHover: (id: string | null) => void;
}

const ImageRow = memo(function ImageRow({ image: img, hovered, onSelect, onHover }: ImageRowProps) {
  return (
    <tr
      onClick={() => onSelect(img)}
      onMouseEnter={() => onHover(img.id)}
      onMouseLeave={() => onHover(null)}
      className={[
        'cursor-pointer border-b border-active border-l-2 transition-colors',
        hovered ? 'bg-hover border-l-fg5' : 'bg-transparent border-l-transparent',
        img.inUse && hovered ? 'border-l-green' : '',
      ].join(' ')}
    >
      <td className="py-cell px-3">
        <span className="text-base text-fg">{img.repo}</span>
      </td>
      <td className="py-cell px-3">
        <span className="text-sm bg-input px-1.5 py-0.5 rounded-sm text-fg3">{img.tag}</span>
      </td>
      <td className="py-cell px-3">
        <span className="text-sm text-fg4 tabular-nums">{img.id.replace('sha256:', '').slice(0, 12)}</span>
      </td>
      <td className="py-cell px-3">
        <span className="text-sm text-fg4">{img.created}</span>
      </td>
      <td className="py-cell px-3">
        <span className="text-sm text-fg3 tabular-nums">{img.size}</span>
      </td>
      <td className="py-cell px-3">
        {img.inUse
          ? <span className="text-xs text-green">● yes</span>
          : <span className="text-xs text-fg4">○ no</span>}
      </td>
      <td className="py-cell px-3">
        <div className={`flex justify-end gap-0.5 transition-opacity duration-100 ${hovered ? 'opacity-100' : 'opacity-0'}`}>
          <ActionIcon title="Run">▶</ActionIcon>
          <ActionIcon title="Pull latest">↓</ActionIcon>
          <ActionIcon title="Remove" danger>✕</ActionIcon>
        </div>
      </td>
    </tr>
  );
});

interface ImagesViewProps {
  images: Image[];
}

export function ImagesView({ images }: ImagesViewProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const selectImage = useAppStore((s) => s.selectImage);
  const handleHover = useCallback((id: string | null) => setHoveredId(id), []);

  return (
    <div className="flex-1 overflow-auto font-mono">
      <table className="w-full border-collapse table-fixed min-w-[900px]">
        <thead>
          <tr>
            <th className={`${TH} w-[240px]`}>REPOSITORY</th>
            <th className={`${TH} w-[140px]`}>TAG</th>
            <th className={`${TH} w-[130px]`}>IMAGE ID</th>
            <th className={`${TH} w-[140px]`}>CREATED</th>
            <th className={`${TH} w-[90px]`}>SIZE</th>
            <th className={`${TH} w-[80px]`}>IN USE</th>
            <th className={`${TH} w-[100px]`} />
          </tr>
        </thead>
        <tbody>
          {images.map((img) => (
            <ImageRow
              key={img.id}
              image={img}
              hovered={hoveredId === img.id}
              onSelect={selectImage}
              onHover={handleHover}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
