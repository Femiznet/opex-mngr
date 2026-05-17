import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// 🔄 CHANGE THIS LINE: Import from "sonner" instead of "@/components/ui/toaster"
import { Toaster } from "sonner"; 
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { Navbar } from "@/components/navbar";
import NotFound from "@/pages/not-found";
import Tickets from "@/pages/tickets";
import TicketWorkflow from "@/pages/ticket-workflow";
import Admin from "@/pages/admin";

function HomeRedirect() { 
  if (typeof window !== "undefined") window.location.href = "/tickets";
  return null;
}

const queryClient = new QueryClient();

function Router() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />
      <main className="flex-1 overflow-auto">
        <Switch>
          <Route path="/" component={HomeRedirect} />
          <Route path="/tickets" component={Tickets} />
          <Route path="/tickets/:ticketId" component={TicketWorkflow} />
          <Route path="/admin" component={Admin} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="opex-theme">
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          {/* 🔄 UPDATE THIS TAG: Enable richColors for bright green/red alerts */}
          <Toaster richColors position="top-right" />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
