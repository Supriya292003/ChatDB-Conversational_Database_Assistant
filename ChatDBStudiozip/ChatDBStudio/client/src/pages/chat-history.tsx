import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, MessageSquare, ChevronRight } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface Message {
  id: string;
  sessionId: string | null;
  content: string;
  role: "user" | "assistant";
  createdAt: string;
}

export default function ChatHistory() {
  const { data: sessions = [], isLoading: sessionsLoading } = useQuery<ChatSession[]>({
    queryKey: ["/api/chat/sessions"],
    queryFn: async () => {
      const result = await apiRequest("GET", "/api/chat/sessions");
      return Array.isArray(result) ? result : [];
    },
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
      return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen bg-background p-6 overflow-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Chat History</h1>
        <p className="text-muted-foreground">View all your previous conversations</p>
      </div>

      {sessionsLoading ? (
        <div className="flex justify-center items-center flex-1">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex justify-center items-center flex-1">
          <div className="text-center">
            <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No chat history yet. Start a new conversation!</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3 max-w-3xl mx-auto w-full">
          {sessions.map((session) => (
            <Link key={session.id} href={`/chat/${session.id}`}>
              <Card className="p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <MessageSquare className="w-5 h-5 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <h3 className="font-medium truncate">{session.title}</h3>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(session.updatedAt)}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
