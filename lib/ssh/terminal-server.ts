import { randomUUID } from "node:crypto";
import { WebSocketServer } from "ws";
import * as pty from "node-pty";
import type { IPty } from "node-pty";
import type { IncomingMessage } from "node:http";

import { serverLog } from "../error-handling";
import { getSshConfig, type SshConfig } from "./config";
import { sshToken, persistSshToken } from "./token";

const STARTED = "__d3lta_ssh_server_started";
type GlobalWithSsh = typeof globalThis & {
  [STARTED]?: boolean;
  __d3lta_ssh_server?: unknown;
};

/** Same-origin (locally served) dashboard pages are the only allowed Origin. */
const ALLOWED_ORIGINS = [
  /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/,
];

export interface SshServerInfo {
  host: string;
  port: number;
  started: boolean;
  reason?: string;
}

/** Parse "+xterm" resize params from the handshake query safely. */
function parsePositiveInt(v: string | null, fallback: number): number {
  const n = v ? Number.parseInt(v, 10) : NaN;
  return Number.isInteger(n) && n > 0 && n <= 500 ? n : fallback;
}

/**
 * Controlled env for each spawned shell: normal login environment, minus
 * injection-oriented variables (editor/IDE native preloads, Node require
 * shims) so an interactive web shell stays clean and starts predictably.
 * A vscode "console-ninja" fs hook is one such preload that breaks zsh's
 * dynamic loading — stripped here rather than leaking into the terminal.
 */
function shellEnv(sessionId: string): Record<string, string> {
  const deny = new Set(["LD_PRELOAD", "DYLD_INSERT_LIBRARIES", "NODE_OPTIONS"]);
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value === undefined || deny.has(key)) continue;
    env[key] = value;
  }
  env.TERM = "xterm-256color";
  env.COLORTERM = "truecolor";
  env.D3LTA_SSH_SESSION = sessionId;
  return env;
}

/**
 * Start the browser-webshell PTY bridge (idempotent within the process).
 * Listens on 127.0.0.1 only; each socket is authenticated with the shared
 * session token and its Origin is screened against cross-site WebSocket hijack.
 */
export function startSshServer(): SshServerInfo {
  const g = globalThis as GlobalWithSsh;
  const cfg = getSshConfig();

  if (g[STARTED]) {
    return { host: cfg.host, port: cfg.port, started: true };
  }
  // Never bind a socket during `next build` static generation.
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return { host: cfg.host, port: cfg.port, started: false, reason: "build" };
  }

  try {
    const wss = new WebSocketServer({
      host: cfg.host,
      port: cfg.port,
      perMessageDeflate: false,
      maxPayload: 16 * 1024 * 1024,
    });

    persistSshToken(sshToken());
    g[STARTED] = true;

    wss.on("connection", (ws, req) => handleConnection(ws, req, cfg));
    wss.on("error", (err) => {
      serverLog("error", "ssh", "ws server error", { message: err.message });
    });

    serverLog("info", "ssh", `listening on ${cfg.host}:${cfg.port}`, {
      shell: cfg.shell,
      shellArgs: cfg.shellArgs,
    });

    return { host: cfg.host, port: cfg.port, started: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    serverLog("error", "ssh", "failed to start ws server", { message });
    return { host: cfg.host, port: cfg.port, started: false, reason: message };
  }
}

/** Reject a socket: log + close with a short status code/reason. */
function deny(ws: import("ws").WebSocket, code: number, reason: string): void {
  try {
    ws.close(code, reason);
  } catch {
    /* already closing */
  }
}

function handleConnection(
  ws: import("ws").WebSocket,
  req: IncomingMessage,
  cfg: SshConfig,
): void {
  const url = new URL(req.url ?? "/", `http://${cfg.host}`);
  if (url.searchParams.get("token") !== sshToken()) {
    deny(ws, 4001, "unauthorized");
    serverLog("warn", "ssh", "rejected connection:bad token", {
      ip: req.socket.remoteAddress ?? null,
    });
    return;
  }
  const origin = req.headers.origin ?? null;
  if (origin && !ALLOWED_ORIGINS.some((re) => re.test(origin))) {
    deny(ws, 4002, "origin not allowed");
    serverLog("warn", "ssh", "rejected connection:origin", {
      origin,
      ip: req.socket.remoteAddress ?? null,
    });
    return;
  }

  const cols = parsePositiveInt(url.searchParams.get("cols"), 100);
  const rows = parsePositiveInt(url.searchParams.get("rows"), 30);
  const sessionId = randomUUID().slice(0, 8);

  serverLog("info", "ssh", "session open " + sessionId, {
    origin: origin ?? null,
    ip: req.socket.remoteAddress ?? null,
  });

  let proc: IPty;
  try {
    proc = pty.spawn(cfg.shell, cfg.shellArgs, {
      name: "xterm-256color",
      cols,
      rows,
      cwd: process.env.D3LTA_SSH_CWD || process.cwd(),
      env: shellEnv(sessionId),
    });
  } catch (err) {
    serverLog("error", "ssh", `failed to spawn shell for ${sessionId}`, {
      message: err instanceof Error ? err.message : String(err),
      shell: cfg.shell,
    });
    deny(ws, 1011, "spawn failed");
    return;
  }

  ws.send(JSON.stringify({ t: "ready", d: sessionId }));

  const teardown = () => {
    try {
      proc.kill();
    } catch {
      /* already dead */
    }
  };

  proc.onData((data) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(
        JSON.stringify({
          t: "o",
          d: Buffer.from(data, "utf8").toString("base64"),
        }),
      );
    }
  });

  proc.onExit(({ exitCode, signal }) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(
        JSON.stringify({ t: "e", code: exitCode, signal: signal ?? null }),
      );
    }
    try {
      ws.close();
    } catch {
      /* already closing */
    }
    serverLog("info", "ssh", `session ${sessionId} closed`, {
      code: exitCode,
      signal: signal ?? null,
    });
  });

  ws.on("message", (data) => {
    const text = Buffer.isBuffer(data) ? data.toString("utf8") : String(data);
    let msg: { t?: string; d?: unknown; cols?: number; rows?: number };
    try {
      msg = JSON.parse(text);
    } catch {
      return;
    }
    if (msg.t === "i" && typeof msg.d === "string") {
      try {
        proc.write(msg.d);
      } catch {
        teardown();
      }
    } else if (msg.t === "r") {
      const c = typeof msg.cols === "number" ? Math.floor(msg.cols) : 0;
      const r = typeof msg.rows === "number" ? Math.floor(msg.rows) : 0;
      if (c > 0 && r > 0) {
        try {
          proc.resize(c, r);
        } catch {
          /* ignore invalid resize */
        }
      }
    }
  });

  ws.on("close", () => {
    teardown();
    serverLog("info", "ssh", `session ${sessionId} client disconnected`);
  });
  ws.on("error", (err) => {
    serverLog("error", "ssh", `session ${sessionId} socket error`, {
      message: err.message,
    });
    teardown();
  });
}
