import {
  LayoutDashboard,
  Palette,
  Orbit,
  Settings,
  BarChart3,
  Users,
  FileText,
  Server,
  Bot,
  Bell,
  CheckSquare,
  CloudSun,
  SquareTerminal,
} from "lucide-react";
import type { ComponentType } from "react";

// Single source of truth for the dashboard navigation tree. Used by the
// desktop Sidebar and the mobile drawer so both stay in sync.
export interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

export const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/reminders", label: "Reminders", icon: Bell },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/weather", label: "Weather", icon: CloudSun },
  { href: "/themes", label: "Themes", icon: Palette },
  { href: "/visuals", label: "Visuals", icon: Orbit },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/users", label: "Users", icon: Users },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/system", label: "System", icon: Server },
  { href: "/ssh", label: "Shell", icon: SquareTerminal },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/settings", label: "Settings", icon: Settings },
];
