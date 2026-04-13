import { useState, useEffect } from 'react';

export function useLogs(containerId: string): string[] {
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    setLines([]);
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/logs/${containerId}`);

    ws.onmessage = (e) => {
      setLines((prev) => [...prev, String(e.data)]);
    };

    return () => ws.close();
  }, [containerId]);

  return lines;
}
