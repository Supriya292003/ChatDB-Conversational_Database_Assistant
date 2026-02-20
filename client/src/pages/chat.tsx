import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Send, Loader2, Paperclip, X, FileSpreadsheet, FileText, Image } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  sessionId: string | null;
  content: any;
  role: "user" | "assistant";
  createdAt: string;
}

interface ChatSession {
  id: string;
  title: string;
}

const parseTableContent = (content: string) => {
  if (content.includes("📋 TABLE:")) {
    const lines = content.split("\n");
    const titleIdx = lines.findIndex(l => l.includes("📋 TABLE:"));
    if (titleIdx === -1) return null;

    const title = lines[titleIdx].replace("📋 TABLE:", "").trim();
    const headerIdx = titleIdx + 2;
    if (headerIdx >= lines.length) return null;

    const headers = lines[headerIdx].split("|").map(h => h.trim());
    const dataStartIdx = headerIdx + 2;

    if (dataStartIdx >= lines.length) return { title, headers, rows: [] };

    const rows = lines
      .slice(dataStartIdx)
      .filter(line => line.trim() && !line.includes("---"))
      .map(line => line.split("|").map(cell => cell.trim()));

    return { title, headers, rows };
  }
  return null;
};

export default function Chat() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;
  
  const [input, setInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const getFileIcon = (filename: string) => {
    const ext = filename.toLowerCase().split('.').pop();
    if (['xlsx', 'xls', 'csv'].includes(ext || '')) return FileSpreadsheet;
    if (['pdf'].includes(ext || '')) return FileText;
    if (['png', 'jpg', 'jpeg'].includes(ext || '')) return Image;
    return FileText;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ['.pdf', '.xlsx', '.xls', '.csv', '.png', '.jpg', '.jpeg'];
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (validTypes.includes(ext)) {
        setSelectedFile(file);
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload PDF, Excel, CSV, or image files",
          variant: "destructive"
        });
      }
    }
  };

  const uploadFile = async () => {
    if (!selectedFile) return;
    
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "File imported successfully",
          description: result.message
        });
        queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
        queryClient.invalidateQueries({ queryKey: ["/api/databases"] });
      } else {
        toast({
          title: "Import notice",
          description: result.message || "No tabular data found in file"
        });
      }
      
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Could not process the file",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host || `${window.location.hostname}:${window.location.port || (window.location.protocol === "https:" ? 443 : 80)}`;
      const wsUrl = `${protocol}//${host}/ws`;
      const socket = new WebSocket(wsUrl);
      socket.onmessage = () => {
        queryClient.invalidateQueries({ queryKey: ["/api/chat/history", sessionId] });
        queryClient.invalidateQueries({ queryKey: ["/api/chat/sessions"] });
      };
      socket.onerror = () => {
        console.error("WebSocket error");
      };
      return () => {
        if (socket.readyState === 1) socket.close();
      };
    } catch (error) {
      console.error("WebSocket setup error:", error);
    }
  }, [sessionId]);

  const { data: messages = [] } = useQuery({
    queryKey: ["/api/chat/history", sessionId],
    queryFn: async () => {
      try {
        const result = await apiRequest("GET", `/api/chat/history?sessionId=${sessionId}`);
        if (Array.isArray(result)) {
          return result.map((msg: any) => ({
            ...msg,
            content: String(msg.content || "")
          }));
        }
        return [];
      } catch (e) {
        return [];
      }
    },
    enabled: !!sessionId,
  });

  const { mutate: updateSessionTitle } = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      apiRequest("PATCH", `/api/chat/sessions/${id}`, { title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/sessions"] });
    },
  });

  const { mutate: sendMessage, isPending } = useMutation({
    mutationFn: (content: string) =>
      apiRequest("POST", "/api/chat/message", { sessionId, content, role: "user" }),
    onSuccess: (result: Message[]) => {
      setInput("");
      queryClient.invalidateQueries({ queryKey: ["/api/chat/history", sessionId] });
      
      if (messages.length === 0 && result[0]) {
        const firstMessage = result[0].content;
        const title = firstMessage.length > 30 ? firstMessage.substring(0, 30) + "..." : firstMessage;
        updateSessionTitle({ id: sessionId, title });
      }
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!sessionId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Select a chat or start a new one</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-screen bg-background">
      <div className="flex-1 overflow-y-auto p-6 space-y-4 max-w-4xl mx-auto w-full">
        {!messages || messages.length === 0 ? (
          <div className="flex justify-center items-center h-full">
            <div className="text-center">
              <h2 className="text-2xl font-semibold mb-2">Welcome to ChatDB</h2>
              <p className="text-muted-foreground">Try: "create a table student with id, name, email"</p>
            </div>
          </div>
        ) : (
          messages.map((msg: Message) => {
            const tableData = parseTableContent(msg.content);
            return (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {tableData && msg.role === "assistant" ? (
                  <Card className="max-w-2xl p-4 bg-card">
                    <h3 className="font-bold text-sm mb-2">{tableData.title}</h3>
                    <div className="overflow-x-auto">
                      <Table className="text-xs">
                        <TableHeader>
                          <TableRow>
                            {tableData.headers.map((header, idx) => (
                              <TableHead key={idx} className="bg-black text-white font-bold">
                                {header}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tableData.rows.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={tableData.headers.length} className="text-center text-muted-foreground">
                                (no rows)
                              </TableCell>
                            </TableRow>
                          ) : (
                            tableData.rows.map((row, ridx) => (
                              <TableRow key={ridx}>
                                {row.map((cell, cidx) => (
                                  <TableCell key={cidx} className="text-muted-foreground">
                                    {cell}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </Card>
                ) : (
                  <Card
                    className={`max-w-xl p-4 whitespace-pre-wrap break-words ${
                      msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-card"
                    }`}
                  >
                    <p className="text-sm">{String(msg.content || "")}</p>
                  </Card>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-border p-6 max-w-4xl mx-auto w-full">
        {selectedFile && (
          <div className="mb-3 flex items-center gap-2 p-2 bg-muted rounded-lg">
            {(() => {
              const FileIcon = getFileIcon(selectedFile.name);
              return <FileIcon className="w-5 h-5 text-primary" />;
            })()}
            <span className="text-sm flex-1 truncate">{selectedFile.name}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => {
                setSelectedFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
            >
              <X className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              onClick={uploadFile}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Importing...
                </>
              ) : (
                "Import Data"
              )}
            </Button>
          </div>
        )}
        <div className="flex gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg"
            className="hidden"
          />
          <Button
            variant="outline"
            size="icon"
            className="shrink-0"
            onClick={() => fileInputRef.current?.click()}
            title="Attach PDF, Excel, CSV or Image"
          >
            <Paperclip className="w-4 h-4" />
          </Button>
          <Textarea
            placeholder="Try: create a table student with id, name, email"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (input.trim()) sendMessage(input);
              }
            }}
            className="resize-none"
            rows={3}
          />
          <Button onClick={() => sendMessage(input)} disabled={!input.trim() || isPending} size="icon" className="h-auto">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Attach PDF, Excel, CSV, or images to import data automatically
        </p>
      </div>
    </div>
  );
}
