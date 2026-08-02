"use client";

import { Bot, RefreshCw, Activity, FolderOpen, Clock } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePolling } from "@/hooks/use-polling";

const SOURCE = "agents-list";

interface LastSession {
  id: string;
  title: string | null;
  source: string | null;
  startedAt: number | null;
  messageCount: number;
}

interface ProfileAgent {
  kind: "profile";
  name: string;
  model: string | null;
  provider: string | null;
  sessionCount: number;
  running: boolean;
  lastSession: LastSession | null;
}

interface AgentsPayload {
  timestamp: string;
  profiles: ProfileAgent[];
}

function formatRelativeTime(tsSeconds: number | null): string {
  if (!tsSeconds) return "—";
  const diffMs = Date.now() - tsSeconds * 1000;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function ProfileCard({ agent }: { agent: ProfileAgent }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bot className="h-4 w-4" /> {agent.name}
        </CardTitle>
        <Badge variant={agent.running ? "default" : "secondary"}>
          {agent.running ? "Running" : "Idle"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-1 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Model</span>
          <span className="font-medium">{agent.model ?? "—"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Provider</span>
          <span className="font-medium">{agent.provider ?? "—"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Sessions</span>
          <Badge variant="outline" className="gap-1">
            <FolderOpen className="h-3 w-3" /> {agent.sessionCount}
          </Badge>
        </div>
        <div className="mt-3 border-t pt-3">
          <div className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <Clock className="h-3 w-3" /> Last Session
          </div>
          {agent.lastSession ? (
            <div className="space-y-0.5">
              <p
                className="truncate font-medium"
                title={agent.lastSession.title ?? agent.lastSession.id}
              >
                {agent.lastSession.title ?? agent.lastSession.id}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatRelativeTime(agent.lastSession.startedAt)}
                {agent.lastSession.source
                  ? ` · ${agent.lastSession.source}`
                  : ""}
                {agent.lastSession.messageCount
                  ? ` · ${agent.lastSession.messageCount} msgs`
                  : ""}
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No sessions yet</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function AgentsList() {
  const { data, loading, error, autoRefresh, setAutoRefresh, refresh } =
    usePolling<AgentsPayload>({
      fetcher: async () => {
        const res = await fetch("/api/agents", { cache: "no-store" });
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        return (await res.json()) as AgentsPayload;
      },
      intervalMs: 60000,
      source: SOURCE,
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agents</h1>
          <p className="text-muted-foreground">
            Configured Hermes profiles on this system.
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
          Failed to load agents: {error}
        </div>
      )}

      {!data && !error && (
        <div className="text-sm text-muted-foreground">Loading agents…</div>
      )}

      {data && (
        <div className="space-y-8">
          <section>
            <div className="mb-3 flex items-center gap-2">
              <Bot className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Profiles</h2>
              <Badge variant="outline">{data.profiles.length}</Badge>
            </div>
            {data.profiles.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No Hermes profiles found.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.profiles.map((p) => (
                  <ProfileCard key={p.name} agent={p} />
                ))}
              </div>
            )}
          </section>

          <p className="text-xs text-muted-foreground">
            Last updated: {new Date(data.timestamp).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}
