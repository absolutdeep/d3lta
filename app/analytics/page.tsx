import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">Data analytics and reporting.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Analytics Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Coming soon — charts and data visualizations will appear here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
