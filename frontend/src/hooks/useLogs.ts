import { useState, useEffect, useCallback } from 'react';

interface UseLogsResult {
  lines: string[];
  clear: () => void;
}

export function useLogs(containerId: string): UseLogsResult {
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

  const clear = useCallback(() => setLines([]), []);

  return { lines, clear };
}
