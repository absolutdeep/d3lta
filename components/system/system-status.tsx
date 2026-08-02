"use client";

import {
  Cpu,
  MemoryStick,
  HardDrive,
  Server,
  Activity,
  RefreshCw,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { usePolling } from "@/hooks/use-polling";

const SOURCE = "system-status";

interface SystemStats {
  hostname: string;
  platform: string;
  arch: string;
  systemUptimeSeconds: number;
  timestamp: string;
  cpu: {
    model: string;
    cores: number;
    loadAverage: [number, number, number];
    usagePercent: number;
  };
  memory: {
    totalBytes: number;
    freeBytes: number;
    usedBytes: number;
    usedPercent: number;
  };
  disk: {
    mount: string;
    totalBytes: number;
    freeBytes: number;
    usedBytes: number;
    usedPercent: number;
  };
  process: {
    pid: number;
    uptimeSeconds: number;
    rssBytes: number;
    nodeVersion: string;
  };
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes < 0) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts: string[] = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(" ");
}

function usageColor(percent: number): string {
  if (percent >= 90) return "bg-red-500";
  if (percent >= 70) return "bg-amber-500";
  return "bg-emerald-500";
}

function StatBar({ percent }: { percent: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={`h-full rounded-full transition-all duration-500 ${usageColor(percent)}`}
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate font-medium">{value}</span>
    </div>
  );
}

export function SystemStatus() {
  const {
    data: stats,
    loading,
    error,
    autoRefresh,
    setAutoRefresh,
    refresh,
  } = usePolling<SystemStats>({
    fetcher: async () => {
      const res = await fetch("/api/system", { cache: "no-store" });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      return (await res.json()) as SystemStats;
    },
    intervalMs: 3000,
    source: SOURCE,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System</h1>
          <p className="text-muted-foreground">
            Live computer &amp; process statistics.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh((v) => !v)}
          >
            <Activity className="mr-2 h-4 w-4" />
            {autoRefresh ? "Auto: On" : "Auto: Off"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refresh()}
            disabled={loading}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          Failed to load system stats: {error}
        </div>
      )}

      {!stats && !error && (
        <div className="text-sm text-muted-foreground">
          Loading system statistics…
        </div>
      )}

      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* CPU */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Cpu className="h-4 w-4" /> CPU
              </CardTitle>
              <Badge variant="secondary">{stats.cpu.cores} cores</Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Usage</span>
                  <span className="font-medium">{stats.cpu.usagePercent}%</span>
                </div>
                <StatBar percent={stats.cpu.usagePercent} />
              </div>
              <MetaRow label="Model" value={stats.cpu.model} />
              <MetaRow
                label="Load avg (1/5/15m)"
                value={stats.cpu.loadAverage.join(" / ")}
              />
            </CardContent>
          </Card>

          {/* Memory */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <MemoryStick className="h-4 w-4" /> Memory
              </CardTitle>
              <Badge variant="secondary">{stats.memory.usedPercent}%</Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Used</span>
                  <span className="font-medium">
                    {formatBytes(stats.memory.usedBytes)} /{" "}
                    {formatBytes(stats.memory.totalBytes)}
                  </span>
                </div>
                <StatBar percent={stats.memory.usedPercent} />
              </div>
              <MetaRow
                label="Free"
                value={formatBytes(stats.memory.freeBytes)}
              />
            </CardContent>
          </Card>

          {/* Disk */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <HardDrive className="h-4 w-4" /> Disk
              </CardTitle>
              <Badge variant="secondary">{stats.disk.usedPercent}%</Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Used</span>
                  <span className="font-medium">
                    {formatBytes(stats.disk.usedBytes)} /{" "}
                    {formatBytes(stats.disk.totalBytes)}
                  </span>
                </div>
                <StatBar percent={stats.disk.usedPercent} />
              </div>
              <MetaRow label="Mount" value={stats.disk.mount} />
            </CardContent>
          </Card>

          {/* Process / Runtime */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Server className="h-4 w-4" /> Process
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <MetaRow label="Node" value={stats.process.nodeVersion} />
              <MetaRow label="PID" value={String(stats.process.pid)} />
              <MetaRow
                label="Uptime"
                value={formatUptime(stats.process.uptimeSeconds)}
              />
              <MetaRow
                label="RSS"
                value={formatBytes(stats.process.rssBytes)}
              />
            </CardContent>
          </Card>

          {/* Host */}
          <Card className="sm:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4" /> Host
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
                <MetaRow label="Hostname" value={stats.hostname} />
                <MetaRow label="Platform" value={stats.platform} />
                <MetaRow label="Architecture" value={stats.arch} />
                <MetaRow
                  label="System uptime"
                  value={formatUptime(stats.systemUptimeSeconds)}
                />
              </div>
              <Separator className="my-3" />
              <p className="text-xs text-muted-foreground">
                Last updated: {new Date(stats.timestamp).toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
