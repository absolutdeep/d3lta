import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your dashboard settings.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Coming soon — user preferences, notification settings, and more.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
