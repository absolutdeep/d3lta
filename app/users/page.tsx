import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-[0.2em] uppercase text-foreground">
          Users
        </h1>
        <p className="text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground">
          Manage users and permissions.
        </p>
      </div>
      <Card className="border-fuchsia-500/40 bg-fuchsia-500/10">
        <CardHeader>
          <CardTitle className="text-base">User Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Coming soon — user table with roles and status.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
