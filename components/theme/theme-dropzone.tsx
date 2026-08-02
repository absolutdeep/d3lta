"use client";

import { useCallback, useRef, useState } from "react";
import {
  Upload,
  Link,
  FileJson,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  importThemeFromUrl,
  importThemeFromJsonFile,
} from "@/lib/theme-service";
import { logger } from "@/lib/error-handling";

const SOURCE = "theme-dropzone";

type DropState = "idle" | "loading" | "success" | "error";

export function ThemeDropzone() {
  const [urlInput, setUrlInput] = useState("");
  const [dropState, setDropState] = useState<DropState>("idle");
  const [message, setMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleApply = useCallback(
    async (result: { success: boolean; message: string }) => {
      setDropState(result.success ? "success" : "error");
      setMessage(result.message);
      if (result.success) {
        setTimeout(() => setDropState("idle"), 3000);
      }
    },
    [],
  );

  const handleUrlSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!urlInput.trim()) return;

      setDropState("loading");
      logger.info(SOURCE, `URL submitted: ${urlInput}`);

      const result = await importThemeFromUrl(urlInput.trim());
      setUrlInput("");
      handleApply(result);
    },
    [urlInput, handleApply],
  );

  const handleNativeDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const file = files[0];
        if (!file.name.endsWith(".json")) {
          setDropState("error");
          setMessage("Only JSON files are accepted");
          return;
        }

        setDropState("loading");
        const result = await importThemeFromJsonFile(file);
        handleApply(result);
        return;
      }

      // If text/URL was dropped (e.g. from browser address bar)
      const text = e.dataTransfer.getData("text/plain");
      if (text.trim()) {
        setDropState("loading");
        const result = await importThemeFromUrl(text.trim());
        handleApply(result);
      }
    },
    [handleApply],
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setDropState("loading");
      const result = await importThemeFromJsonFile(file);
      handleApply(result);

      // Reset the file input via ref
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [handleApply],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Link className="h-4 w-4" />
          Import Theme
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* URL input */}
        <form onSubmit={handleUrlSubmit} className="flex gap-2">
          <Input
            placeholder="Paste tweakcn theme URL…"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            disabled={dropState === "loading"}
          />
          <Button
            type="submit"
            disabled={dropState === "loading" || !urlInput.trim()}
          >
            Apply
          </Button>
        </form>

        {/* Drop zone */}
        <div
          onDragEnter={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setDragOver(false);
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            void handleNativeDrop(e);
          }}
          className={cn(
            "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors",
            dragOver
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50",
            dropState === "loading" && "opacity-50 pointer-events-none",
          )}
        >
          <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Drag a <strong>.json</strong> theme file here, or paste a tweakcn
            URL above
          </p>
        </div>

        {/* File upload button */}
        <div className="flex justify-center">
          <input
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            ref={fileInputRef}
            className="hidden"
            id="theme-file-upload"
          />
          <Button
            variant="outline"
            size="sm"
            disabled={dropState === "loading"}
            onClick={() => fileInputRef.current?.click()}
          >
            <FileJson className="mr-2 h-4 w-4" />
            Upload JSON
          </Button>
        </div>

        {/* Status message */}
        {message && (
          <div
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm",
              dropState === "success"
                ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
            )}
          >
            {dropState === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            {message}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
