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

export default function Home() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to d3lta — your dynamic dashboard.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.change}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
            <CardDescription>Monthly revenue over time.</CardDescription>
          </CardHeader>
          <CardContent className="flex h-72 items-center justify-center text-muted-foreground">
            <BarChart3 className="mr-2 h-6 w-6" />
            Chart placeholder — coming soon
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest dashboard events.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
                className="flex items-center justify-between border-b border-border pb-3 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.time}</p>
                </div>
                <span className="text-sm font-medium tabular-nums">
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
