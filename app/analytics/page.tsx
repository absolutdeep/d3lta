import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-[0.2em] uppercase text-foreground">
          Analytics
        </h1>
        <p className="text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground">
          Data analytics and reporting
        </p>
      </div>
      <Card className="border-fuchsia-500/40 bg-card/60">
        <CardHeader>
          <CardTitle className="font-display text-base tracking-[0.15em] uppercase">
            Analytics Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-mono text-xs text-muted-foreground">
            Coming soon — charts and data visualizations will appear here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
