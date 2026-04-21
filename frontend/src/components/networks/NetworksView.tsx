import { useAppStore } from '../../store';
import { ActionIcon } from '../ui/TopBtn';
import { CopyText } from '../ui/CopyText';
import type { Network } from '../../types/docker';

const TH = 'px-3 py-2 text-left text-2xs tracking-widest text-fg5 font-medium bg-bg sticky top-0 z-[1] border-b border-border2 whitespace-nowrap' as const;

interface NetworksViewProps {
  networks: Network[];
}

export function NetworksView({ networks }: NetworksViewProps) {
  const openDialog = useAppStore((s) => s.openDialog);

  return (
    <div className="flex-1 overflow-auto font-mono">
      <table className="w-full border-collapse min-w-[800px]">
        <thead>
          <tr>
            <th className={`${TH} w-[200px]`}>NAME</th>
            <th className={`${TH} w-[100px]`}>DRIVER</th>
            <th className={`${TH} w-[80px]`}>SCOPE</th>
            <th className={`${TH} w-[160px]`}>SUBNET</th>
            <th className={`${TH} w-[110px]`}>CONTAINERS</th>
            <th className={`${TH}`} />
          </tr>
        </thead>
        <tbody>
          {networks.map((n) => (
            <tr key={n.id} className="border-b border-active">
              <td className="py-cell px-3">
                <span className="text-base text-fg">{n.name}</span>
              </td>
              <td className="py-cell px-3">
                <span className="text-sm text-fg3">{n.driver}</span>
              </td>
              <td className="py-cell px-3">
                <span className="text-sm text-fg4">{n.scope}</span>
              </td>
              <td className="py-cell px-3">
                <CopyText value={n.subnet} colorClass="text-fg3">
                  {n.subnet}
                </CopyText>
              </td>
              <td className="py-cell px-3">
                <span className={`text-sm ${n.containers > 0 ? 'text-fg' : 'text-fg5'}`}>
                  {n.containers}
                </span>
              </td>
              <td className="py-cell px-3">
                <div className="flex justify-end">
                  <ActionIcon title="Inspect" onClick={() => openDialog('inspector')}>⇄</ActionIcon>
                  <ActionIcon title="Remove" danger>✕</ActionIcon>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
