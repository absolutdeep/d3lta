import { ThemeDropzone } from "@/components/theme/theme-dropzone";
import { ThemeLibrary } from "@/components/theme/theme-library";

export default function ThemesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-[0.2em] uppercase text-foreground">
          Themes
        </h1>
        <p className="text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground">
          Import and manage dashboard themes
        </p>
        <p className="text-sm text-muted-foreground">
          Paste a tweakcn URL or upload a JSON file.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <ThemeDropzone />
        <ThemeLibrary />
      </div>
    </div>
  );
}
