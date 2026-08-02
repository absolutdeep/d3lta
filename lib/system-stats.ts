// Server-side system statistics gathering (no external deps).
// Uses Node's built-in `os`, `fs`, and `process`. Safe to import only from
// server code (API routes / server components).
import os from "node:os";
import fs from "node:fs";
import process from "node:process";

export interface CpuStats {
  model: string;
  cores: number;
  loadAverage: [number, number, number];
  /** Percentage 0-100, sampled over a short interval. */
  usagePercent: number;
}

export interface MemoryStats {
  totalBytes: number;
  freeBytes: number;
  usedBytes: number;
  usedPercent: number;
}

export interface DiskStats {
  mount: string;
  totalBytes: number;
  freeBytes: number;
  usedBytes: number;
  usedPercent: number;
}

export interface ProcessStats {
  pid: number;
  uptimeSeconds: number;
  rssBytes: number;
  nodeVersion: string;
}

export interface SystemStats {
  hostname: string;
  platform: string;
  arch: string;
  systemUptimeSeconds: number;
  timestamp: string;
  cpu: CpuStats;
  memory: MemoryStats;
  disk: DiskStats;
  process: ProcessStats;
}

function cpuTimes(): { idle: number; total: number } {
  let idle = 0;
  let total = 0;
  for (const cpu of os.cpus()) {
    const t = cpu.times;
    idle += t.idle;
    total += t.user + t.nice + t.sys + t.idle + t.irq;
  }
  return { idle, total };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getCpuUsage(): Promise<number> {
  const a = cpuTimes();
  await sleep(250);
  const b = cpuTimes();
  const idleDelta = b.idle - a.idle;
  const totalDelta = b.total - a.total;
  if (totalDelta <= 0) return 0;
  const usage = 1 - idleDelta / totalDelta;
  return Math.min(100, Math.max(0, Math.round(usage * 100)));
}

function getFirstCpuModel(): string {
  const cpus = os.cpus();
  return cpus.length > 0 ? cpus[0].model : "Unknown";
}

function getDiskStats(): DiskStats {
  // Prefer the filesystem of the current working directory; fall back to "/".
  const mount = fs.existsSync(process.cwd()) ? process.cwd() : "/";
  try {
    const stats = fs.statfsSync(mount);
    const bsize = Number(stats.bsize) || 0;
    const totalBytes = Number(stats.blocks) * bsize;
    const freeBytes = Number(stats.bavail) * bsize;
    const usedBytes = Math.max(0, totalBytes - freeBytes);
    const usedPercent =
      totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 100) : 0;
    return { mount, totalBytes, freeBytes, usedBytes, usedPercent };
  } catch {
    return { mount, totalBytes: 0, freeBytes: 0, usedBytes: 0, usedPercent: 0 };
  }
}

/**
 * Gather a snapshot of system statistics. All individual reads are guarded so a
 * single failed probe never blanks the whole payload.
 */
export async function getSystemStats(): Promise<SystemStats> {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = Math.max(0, totalMem - freeMem);

  const [usagePercent] = await Promise.all([getCpuUsage()]);

  return {
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    systemUptimeSeconds: Math.round(os.uptime()),
    timestamp: new Date().toISOString(),
    cpu: {
      model: getFirstCpuModel(),
      cores: os.cpus().length,
      loadAverage: [
        Math.round(os.loadavg()[0] * 100) / 100,
        Math.round(os.loadavg()[1] * 100) / 100,
        Math.round(os.loadavg()[2] * 100) / 100,
      ],
      usagePercent,
    },
    memory: {
      totalBytes: totalMem,
      freeBytes: freeMem,
      usedBytes: usedMem,
      usedPercent: totalMem > 0 ? Math.round((usedMem / totalMem) * 100) : 0,
    },
    disk: getDiskStats(),
    process: {
      pid: process.pid,
      uptimeSeconds: Math.round(process.uptime()),
      rssBytes: process.memoryUsage().rss,
      nodeVersion: process.version,
    },
  };
}
