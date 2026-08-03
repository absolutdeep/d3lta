"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, Plus, Trash2, Check, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DateTimePicker } from "@/components/reminders/datetime-picker";
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

function SortableReminder({
  reminder,
  onToggle,
  onRemove,
}: {
  reminder: Reminder;
  onToggle: (r: Reminder) => void;
  onRemove: (id: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: String(reminder.id) });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-start justify-between gap-3 rounded-md border p-3 transition-colors hover:bg-white/5 dark:hover:bg-white/5 ${
        isDragging ? "z-10 opacity-80 ring-1 ring-border" : ""
      } ${
        reminder.completed
          ? "border-emerald-500/40 bg-emerald-500/5"
          : "border-fuchsia-500/40 bg-fuchsia-500/5"
      }`}
    >
      <div className="min-w-0 flex-1">
        <p
          className={`font-medium ${
            reminder.completed
              ? "line-through text-muted-foreground"
              : "text-foreground"
          }`}
        >
          {reminder.title}
        </p>
        {reminder.notes && (
          <p className="text-sm text-muted-foreground">{reminder.notes}</p>
        )}
        <p className="text-xs text-muted-foreground tabular-nums">
          {formatDue(reminder.dueAt)}
        </p>
      </div>
      <div className="flex shrink-0 gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="cursor-grab active:cursor-grabbing"
          aria-label={`Reorder reminder ${reminder.title}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void onToggle(reminder)}
          aria-label={
            reminder.completed
              ? `Mark ${reminder.title} as not done`
              : `Mark ${reminder.title} as done`
          }
        >
          <Check className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void onRemove(reminder.id)}
          aria-label={`Delete reminder ${reminder.title}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </li>
  );
}

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueAt, setDueAt] = useState<Date | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

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
          dueAt: dueAt ? dueAt.toISOString() : null,
        }),
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      setTitle("");
      setNotes("");
      setDueAt(null);
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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = reminders.findIndex((r) => String(r.id) === active.id);
    const newIndex = reminders.findIndex((r) => String(r.id) === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    // Optimistic reorder so the UI responds instantly, then persist.
    const reordered = arrayMove(reminders, oldIndex, newIndex);
    setReminders(reordered);
    try {
      const res = await fetch("/api/reminders/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: reordered.map((r) => r.id) }),
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(SOURCE, "reorder failed", { message });
      setError(message);
      await load();
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
        <h1 className="font-display text-2xl font-bold tracking-[0.2em] uppercase text-foreground">
          Reminders
        </h1>
        <p className="text-sm text-muted-foreground">
          Basic reminder tracking. Add a reminder, mark it done, or remove it.
          Drag the grip handle to reorder.
        </p>
      </div>

      <Card className="border-fuchsia-500/40 bg-fuchsia-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground">
            <Plus className="h-4 w-4 text-fuchsia-700 dark:text-fuchsia-400" />{" "}
            New reminder
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              placeholder="Title"
              aria-label="Reminder title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <DateTimePicker
              value={dueAt}
              onChange={setDueAt}
              placeholder="Pick date & time"
              id="reminder-due"
              aria-label="Reminder due date and time"
            />
          </div>
          <textarea
            aria-label="Reminder notes"
            className="min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <Button
            className="border-fuchsia-500/40 text-fuchsia-700 dark:text-fuchsia-300"
            onClick={() => void create()}
            disabled={!title.trim()}
          >
            <Plus className="mr-2 h-4 w-4" /> Add reminder
          </Button>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 font-mono text-sm text-red-700 dark:text-red-400">
          Failed to load reminders: {error}
        </div>
      )}

      <Card className="border-cyan-500/40 bg-cyan-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground">
            <Bell className="h-4 w-4 text-cyan-700 dark:text-cyan-400" />{" "}
            Reminders{" "}
            <Badge
              variant="outline"
              className="border-cyan-500/40 font-mono text-cyan-700 dark:text-cyan-300 tabular-nums"
            >
              {reminders.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reminders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reminders yet.</p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(e) => void handleDragEnd(e)}
            >
              <SortableContext
                items={reminders.map((r) => String(r.id))}
                strategy={verticalListSortingStrategy}
              >
                <ul className="space-y-2 font-mono">
                  {reminders.map((r) => (
                    <SortableReminder
                      key={r.id}
                      reminder={r}
                      onToggle={toggle}
                      onRemove={remove}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
