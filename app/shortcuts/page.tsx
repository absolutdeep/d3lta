"use client";

import { useState } from "react";
import {
  ExternalLink,
  Plus,
  Edit,
  Trash2,
  Eye,
  GripVertical,
} from "lucide-react";
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

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Shortcut {
  id: string;
  title: string;
  description: string;
  url: string;
  category: string;
  tags: string[];
}

const initialShortcuts: Shortcut[] = [
  {
    id: "1",
    title: "Google Analytics",
    description: "Track website traffic, user behavior, and conversion metrics",
    url: "https://analytics.google.com",
    category: "Analytics",
    tags: ["Traffic", "Conversions", "Real-time"],
  },
  {
    id: "2",
    title: "Mixpanel",
    description: "Product analytics for user engagement and retention tracking",
    url: "https://mixpanel.com",
    category: "Product Analytics",
    tags: ["Events", "Funnels", "Cohorts"],
  },
  {
    id: "3",
    title: "Amplitude",
    description: "Digital analytics platform for product intelligence",
    url: "https://amplitude.com",
    category: "Product Analytics",
    tags: ["Behavioral", "Paths", "Retention"],
  },
  {
    id: "4",
    title: "Hotjar",
    description: "Heatmaps, session recordings, and user feedback tools",
    url: "https://hotjar.com",
    category: "UX Analytics",
    tags: ["Heatmaps", "Recordings", "Surveys"],
  },
  {
    id: "5",
    title: "PostHog",
    description:
      "Open-source product analytics with feature flags and session replay",
    url: "https://posthog.com",
    category: "Product Analytics",
    tags: ["Open Source", "Flags", "Replay"],
  },
  {
    id: "6",
    title: "Matomo",
    description:
      "Privacy-focused web analytics alternative to Google Analytics",
    url: "https://matomo.org",
    category: "Analytics",
    tags: ["Privacy", "Self-hosted", "GDPR"],
  },
  {
    id: "7",
    title: "Plausible",
    description: "Lightweight, privacy-friendly web analytics",
    url: "https://plausible.io",
    category: "Analytics",
    tags: ["Lightweight", "Privacy", "Simple"],
  },
  {
    id: "8",
    title: "Fathom Analytics",
    description: "Simple, privacy-first website analytics",
    url: "https://usefathom.com",
    category: "Analytics",
    tags: ["Simple", "Privacy", "Fast"],
  },
];

const categoryColors: Record<string, string> = {
  Analytics: "border-fuchsia-500/40 bg-fuchsia-500/5 text-fuchsia-300",
  "Product Analytics": "border-cyan-500/40 bg-cyan-500/5 text-cyan-300",
  "UX Analytics": "border-emerald-500/40 bg-emerald-500/5 text-emerald-300",
};

function SortableShortcutCard({ shortcut }: { shortcut: Shortcut }) {
  const categoryStyle = categoryColors[shortcut.category] || "border-border";
  const [borderClass, bgClass, textClass] = categoryStyle.split(" ");

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: shortcut.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`group relative overflow-hidden transition-all duration-300 hover:shadow-[0_0_24px_rgba(217,70,239,0.12)] ${borderClass} ${bgClass} ${
        isDragging ? "z-10 opacity-80 ring-1 ring-fuchsia-500/40" : ""
      }`}
    >
      <Card className="h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <button
                {...attributes}
                {...listeners}
                className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-fuchsia-300 hover:bg-fuchsia-500/10 rounded-md transition-colors shrink-0"
                aria-label="Drag to reorder"
              >
                <GripVertical className="h-4 w-4" />
              </button>
              <div className="min-w-0 flex-1">
                <CardTitle className="font-display text-base tracking-[0.1em] uppercase truncate text-foreground">
                  {shortcut.title}
                </CardTitle>
                <CardDescription className="mt-1 text-xs text-muted-foreground line-clamp-2">
                  {shortcut.description}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-cyan-300 hover:bg-cyan-500/10"
                aria-label="View details"
              >
                <Eye className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-amber-300 hover:bg-amber-500/10"
                aria-label="Edit shortcut"
              >
                <Edit className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                aria-label="Delete shortcut"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pb-3 flex-1">
          <div className="flex flex-wrap gap-1.5 mb-3">
            <Badge
              variant="outline"
              className={`text-[10px] font-medium tracking-[0.1em] uppercase ${textClass} ${borderClass}`}
            >
              {shortcut.category}
            </Badge>
            {shortcut.tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-[10px] font-medium border-border/40 bg-border/20 text-muted-foreground/70"
              >
                {tag}
              </Badge>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
            <ExternalLink className="h-3 w-3 shrink-0 opacity-50" />
            <span className="truncate">{new URL(shortcut.url).hostname}</span>
          </div>
        </CardContent>

        <CardFooter className="pt-0">
          <a
            href={shortcut.url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full"
          >
            <Button
              className={`w-full justify-center gap-2 ${textClass} hover:bg-opacity-20 border ${borderClass} transition-all`}
              aria-label={`Open ${shortcut.title} in new tab`}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="font-display text-xs tracking-[0.1em] uppercase">
                Open Tool
              </span>
            </Button>
          </a>
        </CardFooter>
      </Card>
    </li>
  );
}

export default function ShortcutsPage() {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>(initialShortcuts);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = shortcuts.findIndex((s) => s.id === active.id);
      const newIndex = shortcuts.findIndex((s) => s.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        setShortcuts((items) => arrayMove(items, oldIndex, newIndex));
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-[0.2em] uppercase text-foreground">
            Shortcuts
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Quick access to analytics tools and platforms — drag to reorder
          </p>
        </div>
        <Button className="shrink-0 gap-2 border-fuchsia-500/40 hover:bg-fuchsia-500/10 text-fuchsia-300 hover:text-fuchsia-200">
          <Plus className="h-4 w-4" />
          <span className="font-display text-xs tracking-[0.1em] uppercase">
            Add Shortcut
          </span>
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={shortcuts.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 list-none p-0 m-0">
            {shortcuts.map((shortcut) => (
              <SortableShortcutCard key={shortcut.id} shortcut={shortcut} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      {/* Empty state for adding new shortcuts */}
      <Card className="border-dashed border-fuchsia-500/30 bg-fuchsia-500/5">
        <CardContent className="flex h-48 items-center justify-center">
          <div className="text-center">
            <Plus className="mx-auto h-8 w-8 text-fuchsia-500/50 mb-3" />
            <p className="font-display text-sm tracking-[0.1em] uppercase text-muted-foreground">
              Add your first shortcut
            </p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              Click the &ldquo;Add Shortcut&rdquo; button above to add a new
              analytics tool
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
