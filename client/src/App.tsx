import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Chat from "@/pages/chat";
import DatabaseExplorer from "@/pages/database-explorer";
import ERDiagram from "@/pages/er-diagram";
import Charts from "@/pages/charts";
import ChatHistory from "@/pages/chat-history";
import { AppSidebar } from "@/components/app-sidebar";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/chat/:sessionId" component={Chat} />
      <Route path="/database" component={DatabaseExplorer} />
      <Route path="/diagram" component={ERDiagram} />
      <Route path="/charts" component={Charts} />
      <Route path="/history" component={ChatHistory} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="flex h-screen w-screen overflow-hidden">
          <AppSidebar />
          <Router />
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
