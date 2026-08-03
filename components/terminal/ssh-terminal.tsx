"use client";

import { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

import { Button } from "@/components/ui/button";

// xterm.js color theme tuned to the d3lta cyberpunk console: near-black
// glass, emerald foreground and fuchsia status + selection.
const TERM_THEME = {
  background: "#050505",
  foreground: "#b7ffd8",
  cursor: "#f0abfc",
  cursorAccent: "#050505",
  selectionBackground: "rgba(217,70,239,0.3)",
};

type ConnState = "connecting" | "connected" | "off" | "error";

const STATUS_LABEL: Record<ConnState, { text: string; dot: string }> = {
  connecting: { text: "CONNECTING", dot: "bg-amber-400 animate-pulse" },
  connected: { text: "CONNECTED", dot: "bg-emerald-400" },
  off: { text: "DISCONNECTED", dot: "bg-slate-400" },
  error: { text: "ERROR", dot: "bg-red-400" },
};

export function SshTerminal() {
  const targetRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<ConnState>("connecting");
  const [session, setSession] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const term = new Terminal({
      theme: TERM_THEME,
      fontFamily: '"Geist Mono", ui-monospace, monospace',
      fontSize: 13,
      lineHeight: 1.15,
      letterSpacing: 0,
      cursorBlink: true,
      allowTransparency: true,
      scrollback: 5000,
      // Keep each row at the rendered width; avoid a horizontal scrollbar that
      // steals a column and makes typing feel broken.
      screenReaderMode: false,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(target);

    let ws: WebSocket | null = null;
    let cancelled = false;
    const cleanupTimers: ReturnType<typeof setTimeout>[] = [];

    // Fit is unreliable if run before the flex layout settles — run it on the
    // next frames AND whenever the panel resizes / sidebar toggles.
    const doFit = () => {
      try {
        fit.fit();
      } catch {
        /* not laid out yet */
      }
    };
    cleanupTimers.push(
      setTimeout(doFit, 0),
      setTimeout(doFit, 60),
      setTimeout(doFit, 250),
    );
    const ro =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(doFit) : null;
    if (ro) ro.observe(target.parentElement ?? target);
    const onWinResize = () => window.setTimeout(doFit, 0);
    window.addEventListener("resize", onWinResize);

    const connect = async () => {
      let info: { host: string; port: number; token: string };
      try {
        const res = await fetch("/api/ssh/token", { cache: "no-store" });
        if (!res.ok) throw new Error(`token endpoint ${res.status}`);
        info = (await res.json()) as {
          host: string;
          port: number;
          token: string;
        };
      } catch (err) {
        if (cancelled) return;
        setState("error");
        term.write(
          `\r\n\x1b[31m[err] token fetch failed: ${String(err)}\x1b[0m\r\n`,
        );
        return;
      }

      const proto = window.location.protocol === "https:" ? "wss" : "ws";
      const url = `${proto}://${info.host}:${info.port}/?token=${encodeURIComponent(info.token)}&cols=${term.cols}&rows=${term.rows}`;
      try {
        ws = new WebSocket(url);
      } catch {
        setState("error");
        return;
      }
      ws.binaryType = "arraybuffer";

      ws.onopen = () => {
        if (cancelled) return;
        setState("connected");
        term.write(
          "\r\n\x1b[32m[ok]\x1b[0m linked to the local shell — type `exit` to close.\r\n",
        );
      };
      ws.onmessage = (ev) => {
        let msg: {
          t?: string;
          d?: string;
          code?: number;
          signal?: number | null;
        };
        try {
          msg = JSON.parse(String(ev.data));
        } catch {
          return;
        }
        if (msg.t === "o" && typeof msg.d === "string") {
          try {
            term.write(atob(msg.d));
          } catch {
            /* ignore corrupt frame */
          }
        } else if (msg.t === "ready") {
          if (!cancelled && typeof msg.d === "string") setSession(msg.d);
        } else if (msg.t === "e") {
          if (cancelled) return;
          setState("off");
          term.write(
            `\r\n\x1b[33m[!]\x1b[0m shell exited (code=${msg.code ?? msg.signal ?? "?"}).\r\n`,
          );
        }
      };
      ws.onerror = () => {
        if (cancelled) return;
        setState("error");
      };
      ws.onclose = () => {
        if (cancelled) return;
        setState("off");
        term.write("\r\n\x1b[33m[!]\x1b[0m connection closed.\r\n");
      };

      term.onData((data) => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ t: "i", d: data }));
        }
      });
      term.onResize(({ cols, rows }) => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ t: "r", cols, rows }));
        }
      });
    };

    void connect();

    return () => {
      cancelled = true;
      cleanupTimers.forEach(clearTimeout);
      if (ro) ro.disconnect();
      window.removeEventListener("resize", onWinResize);
      if (ws) {
        try {
          ws.close();
        } catch {
          /* ignore */
        }
      }
      term.dispose();
    };
  }, [nonce]);

  const st = STATUS_LABEL[state];

  return (
    <div className="flex h-[clamp(22rem,72vh,46rem)] min-h-[22rem] flex-col overflow-hidden rounded-xl border border-emerald-500/30 bg-[#050505] shadow-[0_0_24px_rgba(52,211,153,0.06)]">
      <div className="flex min-h-0 shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-white/10 bg-white/[0.02] px-4 py-2">
        <span className="font-display text-xs font-semibold tracking-[0.25em] text-emerald-300 uppercase">
          d3lta~local.com
        </span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
            <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
            {st.text}
          </span>
          <span className="hidden font-mono text-[10px] text-emerald-400/80 sm:inline">
            sess_{session ?? "———"}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSession(null);
              setNonce((n) => n + 1);
            }}
            className="text-[10px] uppercase tracking-[0.15em]"
          >
            Reconnect
          </Button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        {/* xterm.js must have a definitely-sized, non-content-constrained target
            for FitAddon to compute cols/rows correctly. */}
        <div ref={targetRef} className="ssh-terminal absolute inset-0" />
      </div>
    </div>
  );
}
