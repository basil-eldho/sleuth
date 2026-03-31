// Hex color values and font strings for SVG attributes ONLY (fill=, stroke=, fontSize=, fontFamily=).
// Do NOT import this in regular components — use Tailwind classes instead.
export const colors = {
  bg:      '#0d0d0b',
  panel:   '#0a0a09',
  card:    '#0c0c0a',
  input:   '#141413',
  hover:   '#141413',
  active:  '#181817',
  border1: '#1a1a19',
  border2: '#1f1f1e',
  border3: '#232321',
  fg:      '#d0ccc4',
  fg2:     '#a8a49c',
  fg3:     '#7a7670',
  fg4:     '#5a5652',
  fg5:     '#3a3a38',
  fg6:     '#2a2a28',
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
