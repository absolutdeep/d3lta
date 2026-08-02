import { ThemeDropzone } from "@/components/theme/theme-dropzone";
import { ThemeLibrary } from "@/components/theme/theme-library";

export default function ThemesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Themes</h1>
        <p className="text-muted-foreground">
          Import and manage dashboard themes. Paste a tweakcn URL or upload a
          JSON file.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <ThemeDropzone />
        <ThemeLibrary />
      </div>
    </div>
  );
}
