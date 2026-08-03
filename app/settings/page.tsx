import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-[0.2em] uppercase text-foreground">
          Settings
        </h1>
        <p className="text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground">
          Manage your dashboard settings
        </p>
      </div>
      <Card className="border-cyan-500/40 bg-card/60">
        <CardHeader>
          <CardTitle className="font-display text-base font-bold tracking-[0.2em] uppercase">
            Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-mono text-xs text-muted-foreground">
            Coming soon — user preferences, notification settings, and more.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
