import { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import type { Container } from '../../../types/docker';

interface ExecTabProps {
  container: Container;
}

export function ExecTab({ container: c }: ExecTabProps) {
  const [shell, setShell] = useState('/bin/sh');
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mountRef  = useRef<HTMLDivElement>(null);
  const termRef   = useRef<Terminal | null>(null);
  const fitRef    = useRef<FitAddon | null>(null);
  const wsRef     = useRef<WebSocket | null>(null);
  const shellRef  = useRef(shell);
  shellRef.current = shell;

  const disabled = c.status === 'exited';

  function connect() {
    if (wsRef.current) {
      wsRef.current.close();
    }

    setError(null);

    const term = termRef.current!;
    term.reset();

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(
      `${proto}//${window.location.host}/ws/exec/${c.id}?shell=${encodeURIComponent(shellRef.current)}`,
    );
    ws.binaryType = 'arraybuffer';
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      // send initial size
      const fit = fitRef.current!;
      fit.fit();
      ws.send(JSON.stringify({ type: 'resize', rows: term.rows, cols: term.cols }));
    };

    ws.onmessage = (e) => {
      const data = e.data instanceof ArrayBuffer
        ? new Uint8Array(e.data)
        : e.data;
      term.write(data);
    };

    ws.onclose = () => {
      setConnected(false);
      term.write('\r\n\x1b[90m[session closed]\x1b[0m\r\n');
    };

    ws.onerror = () => {
      setError('Connection failed — is the container running?');
      setConnected(false);
    };
  }

  // mount terminal once
  useEffect(() => {
    if (!mountRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: '"JetBrains Mono", "SF Mono", ui-monospace, monospace',
      theme: {
        background:  '#0d0d0b',
        foreground:  '#d0ccc4',
        cursor:      '#3dd68c',
        black:       '#0d0d0b',
        green:       '#3dd68c',
        yellow:      '#e8a742',
        red:         '#e05252',
        blue:        '#7aa8c4',
        cyan:        '#7aa8c4',
        white:       '#d0ccc4',
        brightBlack: '#5a5652',
      },
    });

    const fit = new FitAddon();
    term.loadAddon(fit);
    term.loadAddon(new WebLinksAddon());
    term.open(mountRef.current);
    fit.fit();

    termRef.current = term;
    fitRef.current  = fit;

    // keystrokes → WebSocket
    term.onData((data) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(data);
      }
    });

    // resize → send to backend
    term.onResize(({ rows, cols }) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'resize', rows, cols }));
      }
    });

    const observer = new ResizeObserver(() => fit.fit());
    observer.observe(mountRef.current);

    return () => {
      observer.disconnect();
      wsRef.current?.close();
      term.dispose();
    };
  }, []);

  // reconnect when shell changes (user picks a different shell)
  function handleShellChange(s: string) {
    setShell(s);
    shellRef.current = s;
    if (connected) connect();
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border1 bg-panel shrink-0">
        <span className="text-xs text-fg5">shell:</span>
        <select
          value={shell}
          onChange={(e) => handleShellChange(e.target.value)}
          className="bg-input border border-border3 rounded-sm px-1.5 py-0.5 text-fg text-sm outline-none"
        >
          <option value="/bin/sh">/bin/sh</option>
          <option value="/bin/bash">/bin/bash</option>
          <option value="/usr/bin/zsh">/usr/bin/zsh</option>
        </select>

        <span className="flex-1" />

        {error && <span className="text-xs text-red">{error}</span>}

        {!disabled && (
          <button
            onClick={connect}
            className={[
              'px-2.5 py-0.5 rounded-sm text-xs font-mono border transition-colors',
              connected
                ? 'bg-transparent border-border3 text-fg4 hover:border-fg6 hover:text-fg'
                : 'bg-green-dim border-green-border text-green hover:bg-green-dim-hov',
            ].join(' ')}
          >
            {connected ? '↺ reconnect' : '▶ connect'}
          </button>
        )}

        {disabled && <span className="text-xs text-fg4">container is stopped</span>}
      </div>

      {/* xterm mount */}
      <div
        ref={mountRef}
        className="flex-1 overflow-hidden p-2 bg-bg"
      />
    </div>
  );
}
