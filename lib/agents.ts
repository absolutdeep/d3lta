// Server-side Hermes agent discovery (no external deps).
// A "Hermes agent on this system" = a configured PROFILE under
// ~/.hermes/profiles (each is an independent agent identity with its own
// model/provider/config). Uses Node built-ins only (node:fs, node:os,
// node:path, node:child_process). Server-only.
//
// IMPORTANT: ~/.hermes is treated as READ-ONLY. We open each profile's
// state.db read-only and never mutate anything under ~/.hermes.
//
// Why a child process for SQLite: the installed Next.js/Turbopack ESM server
// bundle cannot resolve the `node:sqlite` built-in (it externalizes then fails
// with "Unsupported external type Url for commonjs reference"). A short-lived
// `node -e` child (which uses the real built-in fine) sidesteps the bundler.
// The DB path is passed via env var, so there is no shell-injection surface.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, execFile } from "node:child_process";
import { serverLog } from "@/lib/error-handling";

const SOURCE = "lib/agents";

export interface LastSession {
  id: string;
  title: string | null;
  source: string | null;
  startedAt: number | null;
  messageCount: number;
}

export interface ProfileAgent {
  kind: "profile";
  name: string;
  model: string | null;
  provider: string | null;
  baseUrl: string | null;
  configPath: string;
  sessionsDir: string;
  sessionCount: number;
  running: boolean;
  lastSession: LastSession | null;
}

export interface AgentsPayload {
  timestamp: string;
  profiles: ProfileAgent[];
}

// Inline Node script run in a child process. Reads the most recent session
// from a profile's state.db (read-only) and prints a single JSON line.
// Hermes sometimes persists the Python repr "None" as a literal title string;
// we normalize that (and empty) to null.
const LAST_SESSION_READER = `
const { DatabaseSync } = require('node:sqlite');
const dbPath = process.env.D3LTA_SESSION_DB;
try {
  const db = new DatabaseSync(dbPath, { readOnly: true });
  const row = db.prepare(
    'SELECT id, title, source, started_at, message_count FROM sessions ORDER BY started_at DESC LIMIT 1'
  ).get();
  db.close();
  if (!row) { console.log('null'); process.exit(0); }
  const t = row.title;
  const title = (t && t !== 'None' && String(t).trim() !== '') ? t : null;
  console.log(JSON.stringify({
    id: row.id,
    title,
    source: row.source ?? null,
    startedAt: row.started_at ?? null,
    messageCount: row.message_count ?? 0,
  }));
} catch (e) {
  console.error(String(e && e.message ? e.message : e));
  process.exit(2);
}
`;

function getHermesHome(): string {
  return process.env.HERMES_HOME || path.join(os.homedir(), ".hermes");
}

function readNestedYamlValue(
  content: string,
  parent: string,
  key: string,
): string | null {
  // Indentation-aware: find `parent:` at column 0, then read its 2-space-indented
  // children until the next top-level key. Return the value of `key:` child.
  const lines = content.split("\n");
  let inBlock = false;
  for (const line of lines) {
    const topMatch = line.match(/^([^\s#][^:]*):/);
    if (topMatch) {
      inBlock = topMatch[1].trim() === parent;
      continue;
    }
    if (!inBlock) continue;
    const child = line.match(/^  ([A-Za-z0-9_-]+):\s*(.+?)\s*$/);
    if (child && child[1] === key) {
      const raw = child[2].trim();
      // Strip surrounding quotes; treat empty / '' / "" as absent.
      const stripped = raw.replace(/^['"]|['"]$/g, "");
      return stripped === "" ? null : stripped;
    }
  }
  return null;
}

function readYamlValue(content: string, key: string): string | null {
  const m = content.match(new RegExp(`^${key}\\s*:\\s*(\\S.*)$`, "m"));
  return m ? m[1] : null;
}

function countSessions(sessionsDir: string): number {
  try {
    if (!fs.existsSync(sessionsDir)) return 0;
    return fs.readdirSync(sessionsDir).filter((f) => {
      const st = fs.statSync(path.join(sessionsDir, f));
      return st.isFile() || st.isDirectory();
    }).length;
  } catch {
    return 0;
  }
}

// Read-only: return the most recent session for a profile via a short-lived
// node child process. Non-blocking (uses async execFile). Returns null if the
// DB is missing/empty/unreadable.
function getLastSession(profileDir: string): Promise<LastSession | null> {
  const dbPath = path.join(profileDir, "state.db");
  if (!fs.existsSync(dbPath) || fs.statSync(dbPath).size === 0) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    execFile(
      process.execPath,
      ["-e", LAST_SESSION_READER],
      {
        env: { ...process.env, D3LTA_SESSION_DB: dbPath },
        timeout: 5000,
      },
      (error: Error | null, stdout: string | Buffer) => {
        const outStr =
          typeof stdout === "string" ? stdout : stdout.toString("utf8");
        if (error || !stdout || outStr.length === 0) {
          if (error) {
            serverLog(
              "error",
              SOURCE,
              `failed to read last session for profile db`,
              {
                dbPath,
                errorName: error.name,
                message: error.message,
              },
            );
          }
          resolve(null);
          return;
        }
        const out = outStr.trim();
        if (out === "null" || out === "") {
          resolve(null);
          return;
        }
        try {
          resolve(JSON.parse(out) as LastSession);
        } catch {
          resolve(null);
        }
      },
    );
  });
}

/**
 * Gather the configured Hermes agents (profiles) on the system, including the
 * most recent session for each. Non-blocking: per-profile config reads and
 * session-DB reads run concurrently via Promise.allSettled so one slow profile
 * (e.g. a large state.db) cannot block the others.
 */
export async function getAgents(): Promise<AgentsPayload> {
  const home = getHermesHome();
  const profilesRoot = path.join(home, "profiles");

  let entries: string[] = [];
  try {
    entries = fs
      .readdirSync(profilesRoot, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    serverLog("error", SOURCE, `failed to list profiles directory`, {
      profilesRoot,
      errorName: err.name,
      message: err.message,
    });
    entries = [];
  }

  // A profile is considered running if the desktop/gateway/serve process for
  // the active profile launch is alive. Cheap proxy: any Hermes serve process
  // present means the backend is up for the active profile. Kept sync — it is
  // a single fast best-effort probe.
  let hermesBackendUp = false;
  try {
    execFileSync("pgrep", ["-f", "hermes_cli.main (serve|gateway)"], {
      stdio: "ignore",
      timeout: 3000,
    });
    hermesBackendUp = true;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    // Exit code 1 from pgrep simply means "no matching process" — not an error.
    const status = (err as { status?: number }).status;
    if (status !== 1) {
      serverLog("warn", SOURCE, `pgrep probe for Hermes backend failed`, {
        errorName: err.name,
        message: err.message,
      });
    }
    hermesBackendUp = false;
  }

  const results = await Promise.allSettled(
    entries.map(async (name): Promise<ProfileAgent> => {
      const profileDir = path.join(profilesRoot, name);
      const configPath = path.join(profileDir, "config.yaml");
      const sessionsDir = path.join(profileDir, "sessions");

      let model: string | null = null;
      let provider: string | null = null;
      let baseUrl: string | null = null;

      try {
        const cfg = fs.readFileSync(configPath, "utf8");
        model =
          readNestedYamlValue(cfg, "model", "default") ||
          readYamlValue(cfg, "model");
        provider =
          readNestedYamlValue(cfg, "model", "provider") ||
          readYamlValue(cfg, "provider");
        baseUrl =
          readNestedYamlValue(cfg, "model", "base_url") ||
          readYamlValue(cfg, "base_url");
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        serverLog("warn", SOURCE, `could not read config for profile`, {
          profile: name,
          configPath,
          errorName: err.name,
          message: err.message,
        });
        // config may not exist; leave fields null
      }

      const lastSession = await getLastSession(profileDir);

      return {
        kind: "profile",
        name,
        model,
        provider,
        baseUrl,
        configPath,
        sessionsDir,
        sessionCount: countSessions(sessionsDir),
        running: hermesBackendUp,
        lastSession,
      };
    }),
  );

  const profileAgents = results
    .filter(
      (r): r is PromiseFulfilledResult<ProfileAgent> =>
        r.status === "fulfilled",
    )
    .map((r) => r.value);

  return {
    timestamp: new Date().toISOString(),
    profiles: profileAgents,
  };
}
