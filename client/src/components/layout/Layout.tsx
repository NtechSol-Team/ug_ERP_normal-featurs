import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";

export function Layout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  
  // If not logged in, just render children (Login page handles its own layout or redirection)
  if (!user) {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background/95">
        <AppSidebar />
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <header className="h-16 flex items-center gap-4 border-b border-border/40 px-6 bg-background/50 backdrop-blur-sm sticky top-0 z-10">
            <SidebarTrigger />
            <div className="ml-auto flex items-center gap-4">
              {/* Add header actions here if needed */}
            </div>
          </header>
          <div className="flex-1 overflow-auto p-6 md:p-8">
            <div className="mx-auto max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-500">
              {children}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
