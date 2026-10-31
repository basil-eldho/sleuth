// Hex color values and font strings for SVG attributes ONLY (fill=, stroke=, fontSize=, fontFamily=).
// Do NOT import this in regular components — use Tailwind classes instead.
export const colors = {
  bg:      '#151512',
  panel:   '#0c0c0b',
  card:    '#1f1e1b',
  input:   '#232320',
  hover:   '#26251f',
  active:  '#2e2d27',
  border1: '#262622',
  border2: '#302f2a',
  border3: '#3c3b34',
  fg:      '#dcd8d2',
  fg2:     '#b5b1ab',
  fg3:     '#93908b',
  fg4:     '#878479',
  fg5:     '#666460',
  fg6:     '#575552',
  green:   '#3dd68c',
  amber:   '#e8a742',
  red:     '#e05252',
  blue:    '#7aa8c4',
  warm:    '#c4a87a',
  // Stack graph edges
  edgeRunning: '#2a4a3a',
  edgeWarning: '#4a3a20',
  edgeExited:  '#4a2a2a',
} as const;

export type ColorKey = keyof typeof colors;

// Font string for SVG text elements — use Tailwind font-mono class in HTML instead.
export const monoFont = "'JetBrains Mono', 'SF Mono', ui-monospace, monospace";
