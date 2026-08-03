// Runtime configuration for the browser webshell (local host only).
// All defaults are safe for a personal localhost dashboard; override via env if
// you need a different port/host/shell.

const DEFAULT_PORT = 4200;
const DEFAULT_HOST = "127.0.0.1";

export interface SshConfig {
  /** Loopback interface the WebSocket PTY bridge binds to. */
  host: string;
  /** TCP port the WebSocket PTY bridge listens on. */
  port: number;
  /** Login shell binary invoked for each session. */
  shell: string;
  /** Arguments to pass so the shell runs as a login shell where supported. */
  shellArgs: string[];
}

let cached: SshConfig | null = null;

function resolveShell(): { shell: string; shellArgs: string[] } {
  // Default to bash (predictable, no fancy prompt plugins). An explicit
  // D3LTA_SSH_SHELL still overrides; we deliberately do NOT fall back to
  // $SHELL so the web shell stays on bash even on machines whose login shell
  // is zsh/fish.
  const shell = process.env.D3LTA_SSH_SHELL || "/bin/bash";
  const base = shell.split("/").pop()?.toLowerCase() ?? "";
  // bash/zsh accept `-l` for a login shell; others we launch bare.
  const shellArgs = base === "bash" || base === "zsh" ? ["-l"] : [];
  return { shell, shellArgs };
}

function resolvePort(): number {
  const raw = process.env.D3LTA_SSH_PORT;
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isInteger(n) && n > 0 && n <= 65535 ? n : DEFAULT_PORT;
}

export function getSshConfig(): SshConfig {
  if (cached) return cached;
  const { shell, shellArgs } = resolveShell();
  cached = {
    host: process.env.D3LTA_SSH_HOST || DEFAULT_HOST,
    port: resolvePort(),
    shell,
    shellArgs,
  };
  return cached;
}

/** Reset the cache (used by tests to vary env between cases). */
export function _resetSshConfig(): void {
  cached = null;
}
