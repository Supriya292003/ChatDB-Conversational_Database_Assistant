import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  createdAt: string;
}

export default function ChatHistory() {
  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: ["/api/chat/history"],
    queryFn: async () => {
      const result = await apiRequest("GET", "/api/chat/history");
      return Array.isArray(result) ? result : [];
    },
  });

  return (
    <div className="flex-1 flex flex-col h-screen bg-background p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Chat History</h1>
        <p className="text-muted-foreground">View all previous conversations</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center flex-1">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : Array.isArray(messages) && messages.length === 0 ? (
        <div className="flex justify-center items-center flex-1">
          <div className="text-center">
            <p className="text-muted-foreground">No chat history yet. Start a conversation!</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3 max-w-3xl mx-auto w-full">
          {Array.isArray(messages) && messages.map((msg: Message) => (
            <Card key={msg.id} className={`p-4 ${msg.role === "user" ? "bg-primary text-primary-foreground ml-auto max-w-xl" : "bg-card"}`} data-testid={`message-history-${msg.id}`}>
              <div className="text-xs text-muted-foreground mb-1">
                {msg.role === "user" ? "You" : "ChatDB"} • {new Date(msg.createdAt).toLocaleTimeString()}
              </div>
              <p className="text-sm">{msg.content}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
