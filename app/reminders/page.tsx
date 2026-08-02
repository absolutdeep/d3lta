"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, Plus, Trash2, Check } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { logger } from "@/lib/error-handling";

const SOURCE = "reminders-page";

interface Reminder {
  id: number;
  title: string;
  notes: string | null;
  dueAt: string | null;
  completed: boolean;
  createdAt: string;
}

function formatDue(dueAt: string | null): string {
  if (!dueAt) return "No due date";
  const d = new Date(dueAt);
  return d.toLocaleString();
}

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueAt, setDueAt] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/reminders", { cache: "no-store" });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data = (await res.json()) as { reminders: Reminder[] };
      setReminders(data.reminders);
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
      const res = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          notes: notes.trim() || null,
          dueAt: dueAt ? new Date(dueAt).toISOString() : null,
        }),
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      setTitle("");
      setNotes("");
      setDueAt("");
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(SOURCE, "create failed", { message });
      setError(message);
    }
  };

  const toggle = async (r: Reminder) => {
    try {
      const res = await fetch(`/api/reminders/${r.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !r.completed }),
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(SOURCE, "toggle failed", { message });
      setError(message);
    }
  };

  const remove = async (id: number) => {
    try {
      const res = await fetch(`/api/reminders/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(SOURCE, "delete failed", { message });
      setError(message);
    }
  };

  // Initial load (deferred per react-hooks/set-state-in-effect guidance)
  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    queueMicrotask(() => void load());
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reminders</h1>
        <p className="text-muted-foreground">
          Basic reminder tracking. Add a reminder, mark it done, or remove it.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="h-4 w-4" /> New reminder
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Input
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
            />
          </div>
          <textarea
            className="min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <Button onClick={() => void create()} disabled={!title.trim()}>
            <Plus className="mr-2 h-4 w-4" /> Add reminder
          </Button>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          Failed to load reminders: {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Reminders <Badge variant="outline">{reminders.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reminders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reminders yet.</p>
          ) : (
            <ul className="space-y-2">
              {reminders.map((r) => (
                <li
                  key={r.id}
                  className="flex items-start justify-between gap-3 rounded-md border border-border p-3"
                >
                  <div className="min-w-0">
                    <p
                      className={`font-medium ${r.completed ? "line-through text-muted-foreground" : ""}`}
                    >
                      {r.title}
                    </p>
                    {r.notes && (
                      <p className="text-sm text-muted-foreground">{r.notes}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {formatDue(r.dueAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void toggle(r)}
                      title={r.completed ? "Mark not done" : "Mark done"}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void remove(r.id)}
                      title="Delete"
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
