import { Link, useLocation } from "wouter";
import { MessageCircle, Database, GitBranch, BarChart3, Clock, Plus, MessageSquare, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

const navigation = [
  { label: "Database Explorer", icon: Database, href: "/database" },
  { label: "ER Diagram", icon: GitBranch, href: "/diagram" },
  { label: "Charts", icon: BarChart3, href: "/charts" },
  { label: "Chat History", icon: Clock, href: "/history" },
];

export function AppSidebar() {
  const [location, setLocation] = useLocation();

  const { data: sessions = [] } = useQuery<ChatSession[]>({
    queryKey: ["/api/chat/sessions"],
    queryFn: async () => {
      const result = await apiRequest("GET", "/api/chat/sessions");
      return Array.isArray(result) ? result : [];
    },
  });

  const { mutate: createSession } = useMutation({
    mutationFn: () => apiRequest("POST", "/api/chat/sessions", { title: "New Chat" }),
    onSuccess: (newSession: ChatSession) => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/sessions"] });
      setLocation(`/chat/${newSession.id}`);
    },
  });

  const { mutate: deleteSession } = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/chat/sessions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/sessions"] });
      if (location.startsWith("/chat/")) {
        setLocation("/");
      }
    },
  });

  const handleNewChat = () => {
    createSession();
  };

  const currentSessionId = location.startsWith("/chat/") ? location.split("/chat/")[1] : null;

  return (
    <aside className="w-64 border-r border-border bg-sidebar h-screen flex flex-col">
      <div className="p-6 border-b border-sidebar-border">
        <h1 className="text-xl font-bold text-sidebar-foreground">ChatDB</h1>
        <p className="text-xs text-muted-foreground mt-1">AI Database Management</p>
      </div>

      <div className="p-4">
        <Button
          onClick={handleNewChat}
          className="w-full justify-start gap-3"
          variant="default"
        >
          <Plus className="w-5 h-5" />
          <span>New Chat</span>
        </Button>
      </div>

      <div className="px-4 pb-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Recent Chats</p>
      </div>

      <ScrollArea className="flex-1 px-2">
        <div className="space-y-1 pb-4">
          {sessions.length === 0 ? (
            <p className="text-xs text-muted-foreground px-2 py-2">No chats yet. Start a new one!</p>
          ) : (
            sessions.slice(0, 10).map((session) => {
              const isActive = currentSessionId === session.id;
              return (
                <div
                  key={session.id}
                  className={`group flex items-center gap-2 rounded-lg px-2 py-2 cursor-pointer ${
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                  }`}
                >
                  <Link href={`/chat/${session.id}`} className="flex-1 flex items-center gap-2 min-w-0">
                    <MessageSquare className="w-4 h-4 shrink-0" />
                    <span className="text-sm truncate">{session.title}</span>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      deleteSession(session.id);
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      <div className="border-t border-sidebar-border">
        <nav className="p-4 space-y-2">
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
      </div>

      <div className="p-4 border-t border-sidebar-border text-xs text-muted-foreground">
        <p>v1.0.0</p>
      </div>
    </aside>
  );
}
