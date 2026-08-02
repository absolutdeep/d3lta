import {
  BarChart3,
  CreditCard,
  DollarSign,
  Users,
  TrendingUp,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const stats = [
  {
    title: "Revenue",
    value: "$45,231.89",
    change: "+20.1% from last month",
    icon: DollarSign,
  },
  {
    title: "Subscriptions",
    value: "+2,350",
    change: "+180.1% from last month",
    icon: Users,
  },
  {
    title: "Active Now",
    value: "+573",
    change: "+19% from last hour",
    icon: CreditCard,
  },
  {
    title: "Conversions",
    value: "12.5%",
    change: "+2.1% from last week",
    icon: TrendingUp,
  },
];

const statAccents = [
  {
    tile: "border-fuchsia-500/40 bg-fuchsia-500/5",
    value: "text-fuchsia-300",
    accent: "text-fuchsia-400",
    icon: "text-fuchsia-400",
  },
  {
    tile: "border-cyan-500/40 bg-cyan-500/5",
    value: "text-cyan-300",
    accent: "text-cyan-400",
    icon: "text-cyan-400",
  },
  {
    tile: "border-emerald-500/40 bg-emerald-500/5",
    value: "text-emerald-300",
    accent: "text-emerald-400",
    icon: "text-emerald-400",
  },
  {
    tile: "border-amber-500/40 bg-amber-500/5",
    value: "text-amber-300",
    accent: "text-amber-400",
    icon: "text-amber-400",
  },
];

export default function Home() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-[0.2em] uppercase text-foreground">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome to d3lta — your dynamic dashboard.
          </p>
        </div>
        <span className="shrink-0 rounded border border-emerald-500/40 px-2 py-1 font-mono text-[10px] tracking-[0.2em] text-emerald-400 uppercase">
          STATUS: ONLINE
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          const a = statAccents[i % statAccents.length];
          return (
            <Card key={stat.title} className={`border ${a.tile}`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${a.icon}`} />
              </CardHeader>
              <CardContent>
                <div
                  className={`font-display text-2xl font-semibold tabular-nums ${a.value}`}
                >
                  {stat.value}
                </div>
                <p className={`mt-1 text-xs ${a.accent}`}>{stat.change}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 border-cyan-500/40 bg-cyan-500/5">
          <CardHeader>
            <CardTitle className="tracking-[0.2em] uppercase">
              Overview
            </CardTitle>
            <CardDescription>Monthly revenue over time.</CardDescription>
          </CardHeader>
          <CardContent className="flex h-72 items-center justify-center gap-2 border-t border-cyan-500/10 pt-4 font-mono text-xs text-muted-foreground">
            <BarChart3 className="mr-1 h-5 w-5 text-cyan-400" />
            Chart placeholder — coming soon
          </CardContent>
        </Card>

        <Card className="col-span-3 border-fuchsia-500/40 bg-fuchsia-500/5">
          <CardHeader>
            <CardTitle className="tracking-[0.2em] uppercase">
              Recent Activity
            </CardTitle>
            <CardDescription>Latest dashboard events.</CardDescription>
          </CardHeader>
          <CardContent className="font-mono">
            {[
              {
                label: "New subscription",
                time: "2 min ago",
                amount: "+$29.99",
              },
              {
                label: "Payment received",
                time: "1 hr ago",
                amount: "$199.00",
              },
              { label: "User signup", time: "3 hr ago", amount: "User #42" },
              {
                label: "Refund processed",
                time: "5 hr ago",
                amount: "-$49.00",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between border-b border-border py-2 last:border-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-foreground">
                    {item.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{item.time}</p>
                </div>
                <span className="shrink-0 pl-3 text-sm font-medium tabular-nums text-cyan-300">
                  {item.amount}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
