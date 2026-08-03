import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-[0.2em] uppercase text-foreground">
          Reports
        </h1>
        <p className="text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground">
          Generate and view reports.
        </p>
      </div>
      <Card className="border-cyan-500/40 bg-cyan-500/10">
        <CardHeader>
          <CardTitle className="text-base">Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Coming soon — report generation and export tools.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
