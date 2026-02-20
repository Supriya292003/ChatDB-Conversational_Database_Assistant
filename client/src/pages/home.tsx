import { useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { MessageCircle, Plus, Loader2 } from "lucide-react";

interface ChatSession {
  id: string;
  title: string;
}

export default function Home() {
  const [, setLocation] = useLocation();

  const { mutate: createSession, isPending } = useMutation({
    mutationFn: () => apiRequest("POST", "/api/chat/sessions", { title: "New Chat" }),
    onSuccess: (newSession: ChatSession) => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/sessions"] });
      setLocation(`/chat/${newSession.id}`);
    },
  });

  return (
    <div className="flex-1 flex flex-col h-screen bg-background">
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md p-6">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <MessageCircle className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-4">Welcome to ChatDB</h1>
          <p className="text-muted-foreground mb-8">
            Your AI-powered database management assistant. Create databases, tables, 
            and manage your data using natural language commands.
          </p>
          <Button
            size="lg"
            onClick={() => createSession()}
            disabled={isPending}
            className="gap-2"
          >
            {isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Plus className="w-5 h-5" />
            )}
            Start New Chat
          </Button>
          <p className="text-xs text-muted-foreground mt-6">
            Try: "create a table student with id, name, email"
          </p>
        </div>
      </div>
    </div>
  );
}
