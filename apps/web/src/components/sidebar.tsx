import { Link, useRouterState } from "@tanstack/react-router";
import { FileText, Home, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

const baseNavItems = [
  { to: "/dashboard", label: "Dashboard", icon: Home },
  { to: "/files", label: "Files", icon: FileText },
] as const;

export function Sidebar() {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const isOnChatPage = currentPath.startsWith("/chat");

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-card">
      <div className="flex h-14 items-center border-b px-4">
        <Link className="flex items-center gap-2 font-semibold" to="/dashboard">
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

      <div className="border-t p-4">
        <div className="flex items-center justify-between">
          <UserMenu />
          <ModeToggle />
        </div>
      </div>
    </aside>
  );
}
