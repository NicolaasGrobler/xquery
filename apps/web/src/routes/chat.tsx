import { useMutation, useQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useNavigate,
  useParams,
} from "@tanstack/react-router";
import {
  Bot,
  ChevronDown,
  ChevronRight,
  History,
  Loader2,
  MessageSquare,
  MoreVertical,
  Plus,
  Search,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useHotkeys } from "@/hooks/use-hotkeys";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { queryClient, trpc, trpcClient } from "@/utils/trpc";

export const Route = createFileRoute("/chat")({
  component: ChatLayout,
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
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) {
    return "just now";
  }
  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  if (diffDays === 1) {
    return "yesterday";
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }
  return then.toLocaleDateString();
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) {
    return text;
  }
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);
  return parts.map((part, index) =>
    regex.test(part) ? (
      // biome-ignore lint/suspicious/noArrayIndexKey: text highlighting produces stable array from split
      <mark className="bg-yellow-200 dark:bg-yellow-800" key={index}>
        {part}
      </mark>
    ) : (
      part
    )
  );
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: chat layout has multiple conditional UI states
function ChatLayout() {
  const navigate = useNavigate();
  const params = useParams({ strict: false });
  const currentChatId = params.chatId as string | undefined;

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [expandedChats, setExpandedChats] = useState<Set<string>>(new Set());
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const currentChatQuery = useQuery({
    ...trpc.chat.get.queryOptions({ chatId: currentChatId ?? "" }),
    enabled: !!currentChatId,
    placeholderData: (prev) => prev,
  });

  const currentFileId = currentChatQuery.data?.fileId;

  const chatsQuery = useQuery({
    ...trpc.chat.list.queryOptions({ fileId: currentFileId }),
    enabled: !!currentFileId,
    placeholderData: (prev) => prev,
  });

  const searchResults = useQuery({
    ...trpc.chat.search.queryOptions({
      fileId: currentFileId ?? "",
      query: debouncedQuery,
    }),
    enabled: !!currentFileId && debouncedQuery.length > 0,
  });

  const isSearchMode = searchQuery.length > 0;

  function toggleChatExpanded(chatId: string) {
    setExpandedChats((prev) => {
      const next = new Set(prev);
      if (next.has(chatId)) {
        next.delete(chatId);
      } else {
        next.add(chatId);
      }
      return next;
    });
  }

  const createChatMutation = useMutation({
    mutationFn: (fileId: string) => trpcClient.chat.create.mutate({ fileId }),
    onSuccess: (data) => {
      queryClient.setQueryData(
        [["chat", "list"], { input: { fileId: currentFileId }, type: "query" }],
        (old: unknown) => {
          if (!(old && Array.isArray(old))) {
            return old;
          }
          return [
            {
              id: data.chatId,
              title: null,
              updatedAt: new Date(),
            },
            ...old,
          ];
        }
      );
      navigate({ to: "/chat/$chatId", params: { chatId: data.chatId } });
    },
    onError: () => {
      toast.error("Failed to create chat");
    },
  });

  const deleteChatMutation = useMutation({
    mutationFn: (chatId: string) => trpcClient.chat.delete.mutate({ chatId }),
    onSuccess: (_, deletedChatId) => {
      toast.success("Chat deleted");
      queryClient.invalidateQueries({ queryKey: [["chat", "list"]] });
      if (currentChatId === deletedChatId) {
        const remainingChats = chatsQuery.data?.filter(
          (c) => c.id !== deletedChatId
        );
        if (remainingChats && remainingChats.length > 0) {
          navigate({
            to: "/chat/$chatId",
            params: { chatId: remainingChats[0].id },
          });
        } else {
          navigate({ to: "/dashboard" });
        }
      }
    },
    onError: () => {
      toast.error("Failed to delete chat");
    },
  });

  const chats = chatsQuery.data ?? [];

  const hotkeys = useMemo(
    () => [
      {
        key: "j",
        ctrl: true,
        shift: true,
        callback: () => {
          if (currentFileId && !createChatMutation.isPending) {
            createChatMutation.mutate(currentFileId);
          }
        },
        enabled: !!currentFileId,
      },
      {
        key: "f",
        ctrl: true,
        shift: true,
        callback: () => {
          searchInputRef.current?.focus();
        },
      },
    ],
    [currentFileId, createChatMutation]
  );

  useHotkeys(hotkeys);

  function handleMobileNavigate() {
    setMobileHistoryOpen(false);
  }

  const sidebarContent = (
    <>
      <div className="flex h-14 items-center justify-between border-b px-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-semibold text-sm">Chats</h2>
        </div>
        <Button
          disabled={!currentFileId || createChatMutation.isPending}
          onClick={() => {
            if (currentFileId) {
              createChatMutation.mutate(currentFileId);
              handleMobileNavigate();
            }
          }}
          size="sm"
          variant="ghost"
        >
          {createChatMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
        </Button>
      </div>

      <div className="border-b p-2">
        <div className="relative">
          <Search className="-translate-y-1/2 absolute top-1/2 left-2 h-4 w-4 text-muted-foreground" />
          <Input
            className="h-8 pr-8 pl-8 text-sm"
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chats..."
            ref={searchInputRef}
            value={searchQuery}
          />
          {searchQuery && (
            <Button
              className="-translate-y-1/2 absolute top-1/2 right-1 h-6 w-6"
              onClick={() => setSearchQuery("")}
              size="icon"
              variant="ghost"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="w-full flex-1">
        <div className="w-full">
          {isSearchMode ? (
            searchResults.isLoading ? (
              <div className="space-y-2 p-2">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : (searchResults.data?.chats.length ?? 0) === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                <Search className="mx-auto mb-2 h-8 w-8 opacity-50" />
                <p>No results found</p>
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {searchResults.data?.chats.map((searchChat) => (
                  <div
                    className="overflow-hidden rounded-md border bg-background"
                    key={searchChat.id}
                  >
                    <button
                      className={cn(
                        "flex w-full items-center gap-2 overflow-hidden p-2 text-left hover:bg-muted/50",
                        currentChatId === searchChat.id && "bg-muted/50"
                      )}
                      onClick={() => {
                        navigate({
                          to: "/chat/$chatId",
                          params: { chatId: searchChat.id },
                        });
                        handleMobileNavigate();
                      }}
                      type="button"
                    >
                      <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <p className="truncate font-medium text-sm">
                          {highlightMatch(
                            searchChat.title || "New chat",
                            debouncedQuery
                          )}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {searchChat.matchingMessages.length} match
                          {searchChat.matchingMessages.length !== 1 && "es"}
                        </p>
                      </div>
                      <Button
                        className="h-6 w-6 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleChatExpanded(searchChat.id);
                        }}
                        size="icon"
                        variant="ghost"
                      >
                        {expandedChats.has(searchChat.id) ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronRight className="h-3 w-3" />
                        )}
                      </Button>
                    </button>
                    {expandedChats.has(searchChat.id) && (
                      <div className="space-y-2 border-t bg-muted/30 p-2">
                        {searchChat.matchingMessages.map((msg) => (
                          <div
                            className="flex items-start gap-2 text-xs"
                            key={msg.id}
                          >
                            {msg.role === "user" ? (
                              <User className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                            ) : (
                              <Bot className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                            )}
                            <p className="line-clamp-2 text-muted-foreground">
                              {highlightMatch(msg.content, debouncedQuery)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          ) : chatsQuery.isLoading ? (
            <div className="space-y-2 p-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : chats.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              <MessageSquare className="mx-auto mb-2 h-8 w-8 opacity-50" />
              <p>No chats yet</p>
              <Button
                asChild
                className="mt-2"
                onClick={handleMobileNavigate}
                size="sm"
                variant="outline"
              >
                <Link to="/dashboard">Start from Dashboard</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {chats.map((chatItem) => (
                <div
                  className={cn(
                    "group relative overflow-hidden rounded-md transition-colors hover:bg-muted",
                    currentChatId === chatItem.id && "bg-muted"
                  )}
                  key={chatItem.id}
                >
                  <Link
                    className="block overflow-hidden p-2"
                    onClick={handleMobileNavigate}
                    params={{ chatId: chatItem.id }}
                    to="/chat/$chatId"
                  >
                    <div className="flex items-start gap-2 overflow-hidden">
                      <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <p className="truncate font-medium text-sm">
                          {chatItem.title || "New chat"}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {formatRelativeTime(chatItem.updatedAt)}
                        </p>
                      </div>
                    </div>
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100"
                        size="icon"
                        variant="ghost"
                      >
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        disabled={deleteChatMutation.isPending}
                        onClick={() => deleteChatMutation.mutate(chatItem.id)}
                        variant="destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </>
  );

  return (
    <div className="flex h-full flex-col md:flex-row">
      {/* Mobile header with history button */}
      <div className="flex h-12 items-center justify-between border-b bg-muted/30 px-3 md:hidden">
        <h2 className="font-semibold text-sm">Chat</h2>
        <div className="flex items-center gap-1">
          <Button
            disabled={!currentFileId || createChatMutation.isPending}
            onClick={() =>
              currentFileId && createChatMutation.mutate(currentFileId)
            }
            size="sm"
            variant="ghost"
          >
            {createChatMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
          <Button
            onClick={() => setMobileHistoryOpen(true)}
            size="sm"
            variant="ghost"
          >
            <History className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Mobile history drawer */}
      {mobileHistoryOpen && (
        <>
          <button
            aria-label="Close chat history"
            className="fixed inset-0 z-40 cursor-default border-none bg-black/50 md:hidden"
            onClick={() => setMobileHistoryOpen(false)}
            type="button"
          />
          <aside className="fixed inset-y-0 right-0 z-50 flex w-72 flex-col bg-card shadow-lg md:hidden">
            <div className="flex h-14 items-center justify-between border-b px-3">
              <h2 className="font-semibold">Chat History</h2>
              <Button
                onClick={() => setMobileHistoryOpen(false)}
                size="icon"
                variant="ghost"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="border-b p-2">
              <div className="relative">
                <Search className="-translate-y-1/2 absolute top-1/2 left-2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="h-8 pr-8 pl-8 text-sm"
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search chats..."
                  value={searchQuery}
                />
                {searchQuery && (
                  <Button
                    className="-translate-y-1/2 absolute top-1/2 right-1 h-6 w-6"
                    onClick={() => setSearchQuery("")}
                    size="icon"
                    variant="ghost"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
            <ScrollArea className="w-full flex-1">
              <div className="w-full">
                {chatsQuery.isLoading ? (
                  <div className="space-y-2 p-2">
                    <Skeleton className="h-14 w-full" />
                    <Skeleton className="h-14 w-full" />
                    <Skeleton className="h-14 w-full" />
                  </div>
                ) : chats.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    <MessageSquare className="mx-auto mb-2 h-8 w-8 opacity-50" />
                    <p>No chats yet</p>
                  </div>
                ) : (
                  <div className="space-y-1 p-2">
                    {chats.map((chatItem) => (
                      <Link
                        className={cn(
                          "block overflow-hidden rounded-md p-2 transition-colors hover:bg-muted",
                          currentChatId === chatItem.id && "bg-muted"
                        )}
                        key={chatItem.id}
                        onClick={handleMobileNavigate}
                        params={{ chatId: chatItem.id }}
                        to="/chat/$chatId"
                      >
                        <div className="flex items-start gap-2 overflow-hidden">
                          <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0 flex-1 overflow-hidden">
                            <p className="truncate font-medium text-sm">
                              {chatItem.title || "New chat"}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              {formatRelativeTime(chatItem.updatedAt)}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </aside>
        </>
      )}

      {/* Desktop sidebar */}
      <div className="hidden w-64 min-w-0 flex-col overflow-hidden border-r bg-muted/30 md:flex">
        {sidebarContent}
      </div>

      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}
