import { useMemo } from 'react';
import { colors, monoFont } from '../../lib/theme';
import { Dot } from '../ui/Dot';
import type { Stack, StackNode, ContainerStatus } from '../../types/docker';

// SVG layout constants
const COL_W = 220;
const ROW_H = 70;
const BOX_W = 170;
const BOX_H = 50;
const TOP   = 56;
const LEFT  = 24;

const statusFill: Record<ContainerStatus, string> = {
  running: colors.green,
  warning: colors.amber,
  exited:  colors.red,
};

const edgeStroke: Record<ContainerStatus, string> = {
  running: colors.edgeRunning,
  warning: colors.edgeWarning,
  exited:  colors.edgeExited,
};

function legend(color: ContainerStatus) {
  return (
    <span className="flex items-center gap-1.5">
      <Dot color={color === 'running' ? 'green' : color === 'warning' ? 'amber' : 'red'} size="sm" />
      <span>{color}</span>
    </span>
  );
}

interface StackGraphProps {
  stack: Stack;
  onClose: () => void;
}

export function StackGraph({ stack, onClose }: StackGraphProps) {
  const { layers, pos } = useMemo(() => {
    const depth = new Map<string, number>();

    function getDepth(id: string): number {
      if (depth.has(id)) return depth.get(id)!;
      const node = stack.graph.find((n) => n.id === id);
      if (!node || node.depends.length === 0) { depth.set(id, 0); return 0; }
      const d = Math.max(...node.depends.map(getDepth)) + 1;
      depth.set(id, d);
      return d;
    }

    stack.graph.forEach((n) => getDepth(n.id));
    const maxD = Math.max(0, ...Array.from(depth.values()));
    const layers: StackNode[][] = Array.from({ length: maxD + 1 }, () => []);
    stack.graph.forEach((n) => layers[depth.get(n.id)!].push(n));

    const pos: Record<string, { x: number; y: number }> = {};
    layers.forEach((layer, ci) =>
      layer.forEach((n, ri) => {
        pos[n.id] = { x: LEFT + ci * COL_W, y: TOP + ri * ROW_H };
      }),
    );

    return { layers, pos };
  }, [stack]);

  const svgW = LEFT + layers.length * COL_W;
  const svgH = TOP + Math.max(...layers.map((l) => l.length)) * ROW_H + 30;

  const edges = stack.graph.flatMap((n) =>
    n.depends.map((dep) => ({ from: pos[dep], to: pos[n.id], status: n.status })),
  ).filter((e) => e.from && e.to);

  return (
    <div className="flex-1 flex flex-col bg-bg font-mono overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border1 bg-card shrink-0">
        <div className="flex items-center gap-2.5">
          <button
            onClick={onClose}
            className="bg-transparent border-none cursor-pointer text-fg4 text-sm font-mono p-0 hover:text-fg transition-colors"
          >
            ← stacks
          </button>
          <span className="text-fg6 text-sm">/</span>
          <span className="text-base text-fg">{stack.name}</span>
          <span className="text-xs text-fg4">graph · {stack.graph.length} services</span>
        </div>
        <span className="text-2xs text-fg5">esc to close</span>
      </div>

      {/* SVG canvas */}
      <div className="flex-1 overflow-auto p-2">
        {/* inline style on SVG dimensions is legitimate — runtime-calculated layout geometry */}
        <svg width={svgW} height={svgH} style={{ display: 'block' }}>
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={colors.fg5} />
            </marker>
          </defs>

          {/* Layer labels */}
          {layers.map((_, i) => (
            <text key={i} x={LEFT + i * COL_W} y={28} fill={colors.fg5} fontSize="9" fontFamily={monoFont} letterSpacing="0.12em">
              {`LAYER ${i}${i === 0 ? ' · NO DEPS' : ''}`}
            </text>
          ))}

          {/* Edges */}
          {edges.map((e, i) => {
            const x1 = e.from.x + BOX_W;
            const y1 = e.from.y + BOX_H / 2;
            const x2 = e.to.x;
            const y2 = e.to.y + BOX_H / 2;
            const mx = (x1 + x2) / 2;
            return (
              <path
                key={i}
                d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
                stroke={edgeStroke[e.status]}
                strokeWidth="1.2"
                fill="none"
                markerEnd="url(#arrow)"
              />
            );
          })}

          {/* Nodes */}
          {stack.graph.map((n) => {
            const p = pos[n.id];
            return (
              <g key={n.id} transform={`translate(${p.x}, ${p.y})`}>
                <rect x="0" y="0" width={BOX_W} height={BOX_H} fill={colors.card} stroke={colors.border2} rx="3" />
                <rect x="0" y="0" width="2" height={BOX_H} fill={statusFill[n.status]} />
                <circle cx="14" cy="16" r="3" fill={statusFill[n.status]} />
                <text x="24" y="20" fill={colors.fg} fontSize="11" fontFamily={monoFont}>{n.id}</text>
                <text x="14" y="36" fill={colors.fg4} fontSize="9" fontFamily={monoFont}>
                  {n.depends.length === 0 ? 'no deps' : `← ${n.depends.join(', ')}`}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-4 px-4 py-2.5 border-t border-border1 bg-panel text-xs text-fg4 shrink-0 flex-wrap">
        <span>startup order: layer 0 first → cascades right</span>
        <span className="flex-1" />
        {legend('running')}
        {legend('warning')}
        {legend('exited')}
      </div>
    </div>
  );
}
