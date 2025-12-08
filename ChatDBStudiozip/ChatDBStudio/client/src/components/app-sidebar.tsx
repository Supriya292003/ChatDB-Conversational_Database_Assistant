import { Link, useLocation } from "wouter";
import { MessageCircle, Database, GitBranch, BarChart3, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

const navigation = [
  { label: "Chat", icon: MessageCircle, href: "/" },
  { label: "Database Explorer", icon: Database, href: "/database" },
  { label: "ER Diagram", icon: GitBranch, href: "/diagram" },
  { label: "Charts", icon: BarChart3, href: "/charts" },
  { label: "Chat History", icon: Clock, href: "/history" },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <aside className="w-64 border-r border-border bg-sidebar h-screen flex flex-col">
      <div className="p-6 border-b border-sidebar-border">
        <h1 className="text-xl font-bold text-sidebar-foreground">ChatDB</h1>
        <p className="text-xs text-muted-foreground mt-1">AI Database Management</p>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href;

          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant="ghost"
                className={`w-full justify-start gap-3 ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                }`}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Button>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border text-xs text-muted-foreground">
        <p>v1.0.0</p>
      </div>
    </aside>
  );
}
