import { FolderOpen, Trash2 } from 'lucide-react';
import { ActionIcon } from '../ui/TopBtn';
import { Dot } from '../ui/Dot';
import type { Volume } from '../../types/docker';

const TH = 'px-3 py-2 text-left text-2xs tracking-widest text-fg5 font-medium bg-bg sticky top-0 z-[1] border-b border-border2 whitespace-nowrap' as const;

interface VolumesViewProps {
  volumes: Volume[];
}

export function VolumesView({ volumes }: VolumesViewProps) {
  return (
    <div className="flex-1 overflow-auto font-mono">
      <table className="w-full border-collapse min-w-[700px]">
        <thead>
          <tr>
            <th className={`${TH} w-[260px]`}>NAME</th>
            <th className={`${TH} w-[100px]`}>DRIVER</th>
            <th className={`${TH} w-[100px]`}>SIZE</th>
            <th className={`${TH} w-[100px]`}>IN USE</th>
            <th className={`${TH}`} />
          </tr>
        </thead>
        <tbody>
          {volumes.map((v) => (
            <tr key={v.id} className="border-b border-active">
              <td className="py-cell px-3">
                <span className="text-base text-fg">{v.name}</span>
              </td>
              <td className="py-cell px-3">
                <span className="text-sm text-fg3">{v.driver}</span>
              </td>
              <td className="py-cell px-3">
                <span className="text-sm text-fg3 tabular-nums">{v.size}</span>
              </td>
              <td className="py-cell px-3">
                {v.inUse
                  ? <span className="inline-flex items-center gap-1.5 text-xs text-green"><Dot color="green" /> yes</span>
                  : <span className="inline-flex items-center gap-1.5 text-xs text-amber"><Dot color="amber" /> orphan</span>}
              </td>
              <td className="py-cell px-3">
                <div className="flex justify-end">
                  <ActionIcon title="Browse"><FolderOpen size={13} /></ActionIcon>
                  <ActionIcon title="Remove" danger><Trash2 size={13} /></ActionIcon>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
