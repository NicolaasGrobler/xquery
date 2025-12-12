import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Clock, FileText, MessageSquare, Wifi, WifiOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data?.user) {
      throw redirect({
        to: "/login",
      });
    }
    return { session };
  },
});

function formatRelativeTime(date: Date | string) {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) {
    return "Just now";
  }
  if (diffMins < 60) {
    return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`;
  }
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  }
  if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(then);
}

function FilesStatCard({
  count,
  isLoading,
}: {
  count: number;
  isLoading: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="font-medium text-sm">Total Files</CardTitle>
        <FileText className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <>
            <div className="font-bold text-2xl">{count}</div>
            <p className="text-muted-foreground text-xs">
              <Link className="hover:underline" to="/files">
                View all files
              </Link>
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ChatsStatCard({
  count,
  isLoading,
}: {
  count: number;
  isLoading: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="font-medium text-sm">Total Chats</CardTitle>
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <>
            <div className="font-bold text-2xl">{count}</div>
            <p className="text-muted-foreground text-xs">
              Conversations with your documents
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function LastActivityCard({
  lastChat,
  isLoading,
}: {
  lastChat: { createdAt: string; title: string | null } | null;
  isLoading: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="font-medium text-sm">Last Activity</CardTitle>
        <Clock className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-24" />
        ) : lastChat ? (
          <>
            <div className="font-bold text-2xl">
              {formatRelativeTime(lastChat.createdAt)}
            </div>
            <p className="truncate text-muted-foreground text-xs">
              {lastChat.title || "Untitled chat"}
            </p>
          </>
        ) : (
          <>
            <div className="font-bold text-2xl">No activity</div>
            <p className="text-muted-foreground text-xs">
              Start a chat to begin
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ApiStatusCard({
  isOnline,
  isLoading,
}: {
  isOnline: boolean;
  isLoading: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="font-medium text-sm">API Status</CardTitle>
        {isOnline ? (
          <Wifi className="h-4 w-4 text-green-500" />
        ) : (
          <WifiOff className="h-4 w-4 text-destructive" />
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <>
            <div className="flex items-center gap-2 font-bold text-2xl">
              <div
                className={`h-2 w-2 rounded-full ${isOnline ? "bg-green-500" : "bg-destructive"}`}
              />
              {isOnline ? "Online" : "Offline"}
            </div>
            <p className="text-muted-foreground text-xs">
              {isOnline ? "All systems operational" : "Connection issues"}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function DashboardPage() {
  const healthCheck = useQuery(trpc.healthCheck.queryOptions());
  const filesQuery = useQuery(trpc.files.list.queryOptions({ limit: 50 }));
  const chatsQuery = useQuery(trpc.chat.list.queryOptions({}));

  const files = filesQuery.data ?? [];
  const chats = chatsQuery.data ?? [];
  const lastChat = chats.length > 0 ? chats[0] : null;
  const isLoading = filesQuery.isLoading || chatsQuery.isLoading;

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      <h1 className="mb-6 font-bold text-2xl sm:mb-8 md:text-3xl">Dashboard</h1>

      <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-4">
        <FilesStatCard count={files.length} isLoading={isLoading} />
        <ChatsStatCard count={chats.length} isLoading={isLoading} />
        <LastActivityCard isLoading={isLoading} lastChat={lastChat} />
        <ApiStatusCard
          isLoading={healthCheck.isLoading}
          isOnline={!!healthCheck.data}
        />
      </div>
    </div>
  );
}
