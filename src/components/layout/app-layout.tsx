"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { Icons } from "@/components/icons"; // Corrected import
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { UserNav } from "./user-nav";
// Removed Sheet import - using custom sidebar implementation
import { Menu } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/auth-context";
import { DataPrefetcher } from "@/components/navigation/data-prefetcher";
import { SidebarAccountBalances } from "@/components/ui/sidebar";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: Icons.Dashboard },
  { href: "/budget", label: "Budget", icon: Icons.Budget },
  { href: "/paycheck-pulse", label: "Paycheck Pulse", icon: Icons.Activity },
  { href: "/recurring", label: "Recurring", icon: Icons.Recurring },
  { href: "/transactions", label: "Transactions", icon: Icons.Transactions },
  { href: "/accounts", label: "Accounts", icon: Icons.Accounts },
  { href: "/debts", label: "Debt Plan", icon: Icons.Debts },
  { href: "/goals", label: "Goals", icon: Icons.Goals },
  { href: "/investments", label: "Investments", icon: Icons.Investments },
  { href: "/reports", label: "Reports", icon: Icons.Reports },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  const [isMounted, setIsMounted] = React.useState(false);
  
  // Debug logging to track state changes
  React.useEffect(() => {
    console.log("🔍 AppLayout: mobileNavOpen changed to:", mobileNavOpen);
  }, [mobileNavOpen]);
  
  React.useEffect(() => {
    console.log("🔍 AppLayout: pathname changed to:", pathname);
  }, [pathname]);
  
  // Ensure component is fully mounted to prevent hydration issues
  React.useEffect(() => {
    setIsMounted(true);
    console.log("🔍 AppLayout: Component mounted");
  }, []);

  // Simplified navigation handler for custom sidebar
  const handleNavigation = React.useCallback((href: string) => {
    console.log("🔍 AppLayout: handleNavigation called with:", href, "current pathname:", pathname);
    if (pathname === href) return;
    
    // Close sidebar immediately for instant response
    console.log("🔍 AppLayout: Setting mobileNavOpen to false");
    setMobileNavOpen(false);
    
    // Navigate immediately - no need for complex timing with our custom implementation
    console.log("🔍 AppLayout: Navigating to:", href);
    router.push(href);
  }, [pathname, router]);

  React.useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace("/auth");
    }
  }, [loading, isAuthenticated, router]);

  // Remove the conflicting useEffect that was causing double state updates
  // The navigation handler already closes the sidebar, so this is redundant

  if (loading || !isAuthenticated || !isMounted) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  const SidebarNavContent = ({ onNavigation }: { onNavigation?: (href: string) => void }) => {    
    return (
      <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground mobile-nav-content">
        <div className="flex h-16 items-center border-b border-sidebar-border px-6 flex-shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-sidebar-foreground">
            <Icons.Wallet className="h-6 w-6" />
            <span>Unbroken Pockets</span>
          </Link>
        </div>
        <nav className="flex-1 space-y-1 p-4 overflow-y-auto overflow-x-hidden optimized-scroll">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={(e) => {
                console.log("🔍 Navigation Link: Clicked", item.href, "current pathname:", pathname);
                if (onNavigation && pathname !== item.href) {
                  console.log("🔍 Navigation Link: Preventing default and calling onNavigation");
                  e.preventDefault();
                  e.stopPropagation(); // Prevent event bubbling
                  onNavigation(item.href);
                } else {
                  console.log("🔍 Navigation Link: Same page, doing nothing");
                }
              }}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-colors duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                pathname === item.href ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium" : ""
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
        </nav>
        {/* Optimized Account Balances - only render when sidebar is open and stable */}
        {mobileNavOpen && (
          <div className="animate-in fade-in-0 duration-200 delay-300">
            <Separator className="bg-sidebar-border mx-2 my-2" />
            <div className="p-2">
              <SidebarAccountBalances />
            </div>
          </div>
        )}
        
        <Separator className="bg-sidebar-border mx-2 my-2" />
        <div className="p-4 flex-shrink-0">
          <UserNav />
        </div>
      </div>
    );
  };

  return (
    <div className="flex w-full h-screen overflow-hidden">
      {/* Invisible component that handles data prefetching */}
      <DataPrefetcher />
      
      {/* Desktop Sidebar - Fixed position with its own scrolling */}
      <aside className="hidden lg:flex lg:flex-col w-[280px] border-r border-sidebar-border flex-shrink-0 h-screen">
        <div className="h-full overflow-hidden flex flex-col">
          <SidebarNavContent onNavigation={handleNavigation} />
        </div>
      </aside>
      
      {/* Main content area with independent scrolling */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile Header with Simple Custom Sidebar */}
        <div className="lg:hidden">
          {/* Hamburger Button */}
          <Button 
            variant="outline" 
            size="icon" 
            className="fixed top-4 left-4 z-[60] bg-card/95 hover:bg-card shadow-lg transition-all duration-200"
            onClick={() => {
              console.log("🔍 Hamburger: Clicked, current mobileNavOpen:", mobileNavOpen);
              setMobileNavOpen(!mobileNavOpen);
            }}
          >
            <Menu className="h-6 w-6" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>

          {/* Mobile Sidebar Overlay */}
          {mobileNavOpen && (
            <>
                             {/* Backdrop */}
               <div 
                 className="fixed inset-0 z-[50] bg-black/80 animate-in fade-in-0 duration-300 mobile-sidebar-backdrop"
                 onClick={() => {
                   console.log("🔍 Backdrop: Clicked, closing sidebar");
                   setMobileNavOpen(false);
                 }}
               />
               
               {/* Sidebar Panel */}
               <div className="fixed inset-y-0 left-0 z-[51] w-[280px] bg-sidebar text-sidebar-foreground animate-in slide-in-from-left duration-300 will-change-transform mobile-sidebar-panel">
                <SidebarNavContent onNavigation={handleNavigation} />
              </div>
            </>
          )}
        </div>
        
        <main className="flex-1 overflow-y-auto overflow-x-auto bg-background relative">
          {/* Container with padding */}
          <div className="p-4 md:p-6 min-h-full">
            {/* Add padding top to prevent content from being obscured by the mobile menu button */}
            <div className="lg:pt-0 pt-[64px] md:pt-[72px]"> 
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
