"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { logger } from "@/lib/error-handling";

const SOURCE = "tasks-page";

interface Task {
  id: number;
  title: string;
  description: string | null;
  status: "pending" | "in_progress" | "done";
  dueAt: string | null;
  createdAt: string;
}

const STATUS_LABEL: Record<Task["status"], string> = {
  pending: "Pending",
  in_progress: "In progress",
  done: "Done",
};

const STATUS_ACCENT: Record<Task["status"], string> = {
  pending: "border-amber-500/40 text-amber-700 dark:text-amber-400",
  in_progress: "border-cyan-500/40 text-cyan-700 dark:text-cyan-400",
  done: "border-emerald-500/40 text-emerald-700 dark:text-emerald-400",
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<Task["status"]>("pending");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tasks", { cache: "no-store" });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data = (await res.json()) as { tasks: Task[] };
      setTasks(data.tasks);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(SOURCE, "load failed", { message });
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const create = async () => {
    if (!title.trim()) return;
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          status,
        }),
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      setTitle("");
      setDescription("");
      setStatus("pending");
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(SOURCE, "create failed", { message });
      setError(message);
    }
  };

  const update = async (t: Task, patch: Partial<Task>) => {
    try {
      const res = await fetch(`/api/tasks/${t.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(SOURCE, "update failed", { message });
      setError(message);
    }
  };

  const remove = async (id: number) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(SOURCE, "delete failed", { message });
      setError(message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-[0.2em] uppercase text-foreground">
          Tasks
        </h1>
        <p className="text-sm text-muted-foreground">
          Basic task tracking. Add a task, change its status, or remove it.
        </p>
      </div>

      <Card className="border-cyan-500/40 bg-cyan-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground">
            <Plus className="h-4 w-4 text-cyan-700 dark:text-cyan-400" /> New
            task
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              placeholder="Title"
              aria-label="Task title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              aria-label="Task status"
              value={status}
              onChange={(e) => setStatus(e.target.value as Task["status"])}
            >
              <option value="pending">Pending</option>
              <option value="in_progress">In progress</option>
              <option value="done">Done</option>
            </select>
          </div>
          <textarea
            aria-label="Task description"
            className="min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Button
            className="border-cyan-500/40 text-cyan-700 dark:text-cyan-300"
            onClick={() => void create()}
            disabled={!title.trim()}
          >
            <Plus className="mr-2 h-4 w-4" /> Add task
          </Button>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 font-mono text-sm text-red-700 dark:text-red-400">
          Failed to load tasks: {error}
        </div>
      )}

      <Card className="border-fuchsia-500/40 bg-fuchsia-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground">
            Task Queue{" "}
            <Badge
              variant="outline"
              className="border-fuchsia-500/40 font-mono text-fuchsia-700 dark:text-fuchsia-300 tabular-nums"
            >
              {tasks.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tasks yet.</p>
          ) : (
            <ul className="space-y-2 font-mono">
              {tasks.map((t) => (
                <li
                  key={t.id}
                  className="flex items-start justify-between gap-3 rounded-md border border-border p-3 transition-colors hover:bg-white/5 dark:hover:bg-white/5"
                >
                  <div className="min-w-0">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <p className="min-w-0 flex-1 font-medium text-foreground">
                        {t.title}
                      </p>
                      <span
                        className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold tracking-[0.15em] uppercase ${STATUS_ACCENT[t.status]}`}
                      >
                        {t.status === "in_progress"
                          ? "In Progress"
                          : STATUS_LABEL[t.status]}
                      </span>
                    </div>
                    {t.description && (
                      <p className="text-sm text-muted-foreground">
                        {t.description}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <select
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={t.status}
                      onChange={(e) =>
                        void update(t, {
                          status: e.target.value as Task["status"],
                        })
                      }
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In progress</option>
                      <option value="done">Done</option>
                    </select>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void remove(t.id)}
                      aria-label={`Delete task ${t.title}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
