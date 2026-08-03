import os from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";

// In-process secret holder. The terminal WebSocket bridge (started from
// instrumentation.ts) and the /api/ssh/token route both live in the same
// Next.js server process, so a global singleton is a reliable shared store —
// no env required, and the /api route never ships the token to anyone but the
// same-origin dashboard client.
type GlobalWithToken = typeof globalThis & { __d3lta_ssh_token?: string };

/**
 * Resolve the shared webshell session token:
 *  1. an explicit `D3LTA_SSH_TOKEN` env override, else
 *  2. a one-per-process cryptographically-random token (generated on first read
 *     and reused by the bridge + token route via globalThis).
 */
export function sshToken(): string {
  if (process.env.D3LTA_SSH_TOKEN) return process.env.D3LTA_SSH_TOKEN;
  const g = globalThis as GlobalWithToken;
  if (!g.__d3lta_ssh_token) {
    g.__d3lta_ssh_token = `d3lta_${randomBytes(24).toString("base64url")}`;
  }
  return g.__d3lta_ssh_token;
}

/**
 * Where the socket-connection secret file is written (used only when an
 * external process needs the token; the dashboard reads it from globalThis in
 * normal operation).
 */
export function sshSecretFile(): string {
  return path.join(os.tmpdir(), "d3lta-ssh-token");
}

/** Rewrite the secret file with 0600 permissions (best-effort). */
export function persistSshToken(token: string): void {
  try {
    writeFileSync(sshSecretFile(), token, { mode: 0o600 });
  } catch {
    // Non-fatal; the in-process globalThis store is the source of truth.
  }
}
