import { Link, useRouterState } from "@tanstack/react-router";
import { FileText, Home, Menu, MessageSquare, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { KeyboardShortcutsTrigger } from "./keyboard-shortcuts-dialog";
import { ModeToggle } from "./mode-toggle";
import { Button } from "./ui/button";
import UserMenu from "./user-menu";

const baseNavItems = [
  { to: "/dashboard", label: "Dashboard", icon: Home },
  { to: "/files", label: "Files", icon: FileText },
] as const;

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const isOnChatPage = currentPath.startsWith("/chat");

  return (
    <>
      <div className="flex h-14 items-center border-b px-4">
        <Link
          className="flex items-center gap-2 font-semibold"
          onClick={onNavigate}
          to="/dashboard"
        >
          <span className="font-bold text-xl">XQuery</span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {baseNavItems.map(({ to, label, icon: Icon }) => {
          const isActive = currentPath.startsWith(to);

          return (
            <Link
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
              key={to}
              onClick={onNavigate}
              to={to}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
        {isOnChatPage && (
          <div
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm",
              "bg-primary text-primary-foreground"
            )}
          >
            <MessageSquare className="h-4 w-4" />
            Chat
          </div>
        )}
      </nav>

      <div className="px-4 pb-2">
        <KeyboardShortcutsTrigger />
      </div>

      <div className="border-t p-4">
        <div className="flex items-center justify-between">
          <UserMenu />
          <ModeToggle />
        </div>
      </div>
    </>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden h-full w-64 flex-col border-r bg-card md:flex">
      <SidebarContent />
    </aside>
  );
}

export function MobileHeader() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <header className="flex h-14 items-center justify-between border-b bg-card px-4 md:hidden">
        <Link className="flex items-center gap-2 font-semibold" to="/dashboard">
          <span className="font-bold text-xl">XQuery</span>
        </Link>
        <Button onClick={() => setIsOpen(true)} size="icon" variant="ghost">
          <Menu className="h-5 w-5" />
        </Button>
      </header>

      {isOpen && (
        <>
          <button
            aria-label="Close menu"
            className="fixed inset-0 z-40 cursor-default border-none bg-black/50 md:hidden"
            onClick={() => setIsOpen(false)}
            type="button"
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-card shadow-lg md:hidden">
            <div className="absolute top-3 right-3">
              <Button
                onClick={() => setIsOpen(false)}
                size="icon"
                variant="ghost"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <SidebarContent onNavigate={() => setIsOpen(false)} />
          </aside>
        </>
      )}
    </>
  );
}
