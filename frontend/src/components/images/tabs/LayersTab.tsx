import type { ImageLayer } from '../../../types/docker';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1073741824) return (bytes / 1048576).toFixed(0) + ' MB';
  return (bytes / 1073741824).toFixed(1) + ' GB';
}

function instrColor(instruction: string): string {
  if (instruction === 'FROM')                           return 'var(--color-blue)';
  if (instruction === 'RUN')                            return 'var(--color-cache-hit)';
  if (instruction === 'COPY' || instruction === 'ADD')  return 'var(--color-warm)';
  return 'var(--color-fg4)';
}

interface LayersTabProps {
  layers: ImageLayer[];
  imageSize: string;
  imageRepo: string;
  imageTag: string;
}

export function LayersTab({ layers, imageSize, imageRepo, imageTag }: LayersTabProps) {
  const totalBytes  = layers.reduce((a, l) => a + l.sizeBytes, 0);
  const maxBytes    = Math.max(1, ...layers.map((l) => l.sizeBytes));
  const exposeLayer = layers.find((l) => l.instruction === 'EXPOSE');
  const exposePort  = exposeLayer?.detail.split(' ')[0] ?? '8080';

  return (
    <div className="flex-1 overflow-auto p-5">
      <div className="text-2xs tracking-section text-fg5 uppercase mb-3 flex justify-between items-baseline">
        <span>LAYERS · docker history</span>
        <span className="text-fg4 text-xs tracking-normal normal-case">
          {layers.length} layers · {imageSize} total
        </span>
      </div>

      {layers.length === 0 ? (
        <div className="py-10 text-center text-sm text-fg4">layer data not available</div>
      ) : (
        <div className="flex flex-col gap-0.5">
          {layers.map((layer, idx) => {
            const pct    = totalBytes > 0 ? (layer.sizeBytes / totalBytes * 100) : 0;
            const barPct = maxBytes > 0 ? (layer.sizeBytes / maxBytes * 100) : 0;
            const isBig  = layer.sizeBytes > 100_000_000;
            const isBase = layer.instruction === 'FROM';

            return (
              <div
                key={layer.id}
                className={[
                  'flex items-stretch bg-card rounded-sm border-l-2',
                  isBig ? 'border-l-amber' : isBase ? 'border-l-blue' : 'border-l-transparent',
                ].join(' ')}
              >
                <div className="w-9 flex items-center justify-center text-2xs text-fg5 border-r border-border1 shrink-0">
                  {idx}
                </div>
                <div className="flex-1 px-3 py-2 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span
                      className="text-sm font-medium shrink-0 w-[72px]"
                      style={{ color: instrColor(layer.instruction) }}
                    >
                      {layer.instruction}
                    </span>
                    <span className="text-sm text-fg2 overflow-hidden text-ellipsis whitespace-nowrap">
                      {layer.detail}
                    </span>
                  </div>
                  {layer.sizeBytes > 0 && (
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-1.5 bg-border1 rounded-sm overflow-hidden max-w-[300px]">
                        <div
                          className={`h-full rounded-sm ${isBig ? 'bg-amber' : isBase ? 'bg-blue' : 'bg-cache-hit'}`}
                          style={{ width: `${Math.max(1, barPct)}%` }}
                        />
                      </div>
                      <span className={`text-2xs shrink-0 ${isBig ? 'text-amber' : 'text-fg4'}`}>
                        {pct >= 1 ? `${pct.toFixed(0)}%` : '<1%'}
                      </span>
                    </div>
                  )}
                </div>
                <div className="w-[100px] px-3 py-2 flex flex-col justify-center items-end shrink-0 border-l border-border1">
                  <span className={`text-sm whitespace-nowrap ${layer.sizeBytes > 0 ? 'text-fg' : 'text-fg5'}`}>
                    {layer.size}
                  </span>
                  <span className="text-2xs text-fg5 whitespace-nowrap">{layer.created}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-4 mt-4 text-2xs text-fg4 flex-wrap whitespace-nowrap">
        <span><span className="text-blue">■</span> FROM (base)</span>
        <span><span className="text-cache-hit">■</span> RUN</span>
        <span><span className="text-warm">■</span> COPY / ADD</span>
        <span><span className="text-amber">■</span> &gt;100 MB</span>
      </div>

      {layers.length > 0 && (
        <div className="mt-5 px-3 py-2.5 bg-panel border border-border1 rounded-sm text-xs">
          <div className="text-2xs text-fg5 tracking-brand mb-1">QUICK RUN</div>
          <div className="text-fg2">
            <span className="text-green">$</span>{' '}
            docker run -d -p {exposePort}:{exposePort} {imageRepo}:{imageTag}
          </div>
        </div>
      )}
    </div>
  );
}

export { formatBytes };
