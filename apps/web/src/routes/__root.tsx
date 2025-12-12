import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  useRouterState,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { KeyboardShortcutsDialog } from "@/components/keyboard-shortcuts-dialog";
import { Sidebar } from "@/components/sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import type { trpc } from "@/utils/trpc";
import "../index.css";

const AUTH_ROUTES = ["/login"];

export type RouterAppContext = {
  trpc: typeof trpc;
  queryClient: QueryClient;
};

export const Route = createRootRouteWithContext<RouterAppContext>()({
  component: RootComponent,
  head: () => ({
    meta: [
      {
        title: "XQuery",
      },
      {
        name: "description",
        content: "XQuery is a web application",
      },
    ],
    links: [
      {
        rel: "icon",
        href: "/favicon.ico",
      },
    ],
  }),
});

function RootComponent() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAuthRoute = AUTH_ROUTES.includes(pathname);

  return (
    <>
      <HeadContent />
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        disableTransitionOnChange
        storageKey="vite-ui-theme"
      >
        {isAuthRoute ? (
          <main className="h-svh">
            <Outlet />
          </main>
        ) : (
          <div className="flex h-svh">
            <Sidebar />
            <main className="flex-1 overflow-auto">
              <Outlet />
            </main>
          </div>
        )}
        <Toaster richColors />
        {!isAuthRoute && <KeyboardShortcutsDialog />}
      </ThemeProvider>
      <TanStackRouterDevtools position="bottom-left" />
      <ReactQueryDevtools buttonPosition="bottom-right" position="bottom" />
    </>
  );
}
