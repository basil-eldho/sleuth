import { formatBytes } from './LayersTab';
import type { ImageLayer } from '../../../types/docker';

interface HintProps {
  colorClass: string;
  children: React.ReactNode;
}

function Hint({ colorClass, children }: HintProps) {
  return (
    <div className={`flex items-baseline gap-1.5 py-1 text-xs leading-[15px] ${colorClass}`}>
      <span className="shrink-0">→</span>
      <span>{children}</span>
    </div>
  );
}

interface HistoryTabProps {
  layers: ImageLayer[];
}

export function HistoryTab({ layers }: HistoryTabProps) {
  const totalBytes    = layers.reduce((a, l) => a + l.sizeBytes, 0);
  const baseLayer     = layers.find((l) => l.instruction === 'FROM');
  const baseBytes     = baseLayer?.sizeBytes ?? 0;
  const appBytes      = totalBytes - baseBytes;
  const layerCount    = layers.length;
  const runLayers     = layers.filter((l) => l.instruction === 'RUN');
  const nonZeroLayers = layers.filter((l) => l.sizeBytes > 0);

  const efficiency = Math.min(99, Math.max(40,
    100 - (runLayers.length * 5) - (layerCount > 8 ? 10 : 0) - (totalBytes > 500_000_000 ? 15 : 0),
  ));

  const effClass = efficiency >= 80 ? 'text-green' : efficiency >= 60 ? 'text-amber' : 'text-red';
  const effLabel = efficiency >= 80 ? 'good' : efficiency >= 60 ? 'fair — room to optimize' : 'poor — significant waste';
  const basePct  = totalBytes > 0 ? (baseBytes / totalBytes * 100).toFixed(0) : '0';

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <span className={`text-[28px] font-medium leading-none ${effClass}`}>{efficiency}%</span>
        <div>
          <div className="text-xs text-fg3">{effLabel}</div>
          <div className="text-2xs text-fg5 mt-0.5">
            {layerCount} layers · {nonZeroLayers.length} with data · {runLayers.length} RUN steps
          </div>
        </div>
      </div>

      {totalBytes > 0 && (
        <div className="mt-2">
          <div className="text-2xs text-fg5 tracking-brand mb-1">SIZE BREAKDOWN</div>
          <div className="flex h-4 rounded-sm overflow-hidden gap-px">
            <div
              className="bg-blue"
              style={{ width: `${basePct}%`, minWidth: baseBytes > 0 ? 2 : 0 }}
              title={`base: ${baseLayer?.detail ?? '?'}`}
            />
            <div className="flex-1 bg-cache-hit" title="app layers" />
          </div>
          <div className="flex justify-between mt-1 text-2xs text-fg4">
            <span><span className="text-blue">■</span> base {formatBytes(baseBytes)}</span>
            <span><span className="text-cache-hit">■</span> app {formatBytes(appBytes)}</span>
          </div>
        </div>
      )}

      {layers.length > 0 && (
        <div className="mt-4">
          <div className="text-2xs text-fg5 tracking-section uppercase pb-2 border-b border-border1 mb-2">
            hints
          </div>
          {runLayers.length > 2 && (
            <Hint colorClass="text-amber">
              {runLayers.length} RUN layers — consider merging with &amp;&amp;
            </Hint>
          )}
          {baseBytes > 500_000_000 && (
            <Hint colorClass="text-amber">
              base is {formatBytes(baseBytes)} — consider alpine variant
            </Hint>
          )}
          {layers.some((l) => l.instruction === 'COPY' && l.detail === '. .') && (
            <Hint colorClass="text-fg3">
              COPY . . invalidates cache on any file change — use .dockerignore
            </Hint>
          )}
          {efficiency >= 80 && runLayers.length <= 2 && (
            <Hint colorClass="text-green">✓ image looks well-optimized</Hint>
          )}
        </div>
      )}
    </div>
  );
}
