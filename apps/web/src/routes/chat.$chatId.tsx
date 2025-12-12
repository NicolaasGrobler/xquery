import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Bot, FileText, Loader2, Send, User } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useHotkeys } from "@/hooks/use-hotkeys";
import { cn } from "@/lib/utils";
import { queryClient, trpc } from "@/utils/trpc";

export const Route = createFileRoute("/chat/$chatId")({
  component: ChatPage,
});

function ChatPage() {
  const { chatId } = Route.useParams();
  const [input, setInput] = useState("");
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const chatQuery = useQuery({
    ...trpc.chat.get.queryOptions({ chatId }),
    placeholderData: (prev) => prev,
  });

  const messages = chatQuery.data?.messages;

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally scroll when messages or streaming content change
  useEffect(() => {
    const timeout = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
    return () => clearTimeout(timeout);
  }, [messages, streamingContent]);

  const streamQuestion = useCallback(
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: streaming logic requires multiple conditional branches
    async (question: string) => {
      setIsStreaming(true);
      setStreamingContent("");
      setStatusMessage("Connecting...");

      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch(
          `${import.meta.env.VITE_SERVER_URL}/api/chat/stream`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ chatId, question }),
            signal: abortControllerRef.current.signal,
          }
        );

        if (!response.ok) {
          throw new Error("Failed to start stream");
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response body");
        }

        const decoder = new TextDecoder();
        let buffer = "";
        let accumulatedContent = "";
        let receivedDone = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          let currentEvent: string | null = null;
          for (const line of lines) {
            if (line.startsWith("event: ")) {
              currentEvent = line.slice(7);
            } else if (line.startsWith("data: ") && currentEvent) {
              const data = JSON.parse(line.slice(6));

              if (currentEvent === "status") {
                setStatusMessage(data.message);
              } else if (currentEvent === "delta") {
                setStatusMessage("");
                accumulatedContent += data.content;
                setStreamingContent(accumulatedContent);
              } else if (currentEvent === "done") {
                receivedDone = true;
                const userMsgId = data.userMessageId;
                const assistantMsgId = data.assistantMessageId;

                const queryKey = [
                  ["chat", "get"],
                  { input: { chatId }, type: "query" },
                ];

                const existingData = queryClient.getQueryData(queryKey);

                if (existingData && typeof existingData === "object") {
                  const oldData = existingData as {
                    messages?: Array<{
                      id: string;
                      role: string;
                      content: string;
                      createdAt: Date;
                    }>;
                  };
                  queryClient.setQueryData(queryKey, {
                    ...oldData,
                    messages: [
                      ...(oldData.messages || []),
                      {
                        id: userMsgId,
                        role: "user",
                        content: question,
                        createdAt: new Date(),
                      },
                      {
                        id: assistantMsgId,
                        role: "assistant",
                        content: accumulatedContent,
                        createdAt: new Date(),
                      },
                    ],
                  });
                } else {
                  await queryClient.invalidateQueries({ queryKey });
                }

                setPendingMessage(null);
                setStreamingContent("");
                setIsStreaming(false);
              } else if (currentEvent === "error") {
                throw new Error(data.message);
              }
              currentEvent = null;
            }
          }
        }

        if (!receivedDone) {
          setPendingMessage(null);
          setStreamingContent("");
          setIsStreaming(false);
          queryClient.invalidateQueries({
            queryKey: [["chat", "get"], { input: { chatId }, type: "query" }],
          });
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        setPendingMessage(null);
        setStreamingContent("");
        setIsStreaming(false);
        toast.error(
          error instanceof Error ? error.message : "Failed to get response"
        );
      }
    },
    [chatId]
  );

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      const canSubmit = input.trim() && !isStreaming;
      if (!canSubmit) {
        return;
      }

      const question = input.trim();
      setInput("");
      setPendingMessage(question);
      streamQuestion(question);
    },
    [input, isStreaming, streamQuestion]
  );

  const cancelStreaming = useCallback(() => {
    if (isStreaming) {
      abortControllerRef.current?.abort();
      setPendingMessage(null);
      setStreamingContent("");
      setIsStreaming(false);
      toast.info("Cancelled");
    }
  }, [isStreaming]);

  const hotkeys = useMemo(
    () => [
      {
        key: "Enter",
        ctrl: true,
        callback: () => handleSubmit(),
        enabled: !!input.trim() && !isStreaming,
      },
      {
        key: "Escape",
        callback: cancelStreaming,
        enabled: isStreaming,
      },
    ],
    [input, isStreaming, cancelStreaming, handleSubmit]
  );

  useHotkeys(hotkeys);

  useEffect(
    () => () => {
      abortControllerRef.current?.abort();
    },
    []
  );

  const isInitialLoading = chatQuery.isLoading && !chatQuery.data;

  if (isInitialLoading) {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b p-4">
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="flex-1 space-y-4 p-4">
          <Skeleton className="h-16 w-3/4" />
          <Skeleton className="ml-auto h-16 w-2/3" />
          <Skeleton className="h-16 w-3/4" />
        </div>
      </div>
    );
  }

  if (chatQuery.error && !chatQuery.data) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-muted-foreground">Chat not found</p>
        </div>
      </div>
    );
  }

  const chatData = chatQuery.data;
  const displayMessages = messages ?? [];

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-4 border-b px-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate font-medium">{chatData?.fileName}</span>
          </div>
          {chatData?.title && (
            <p className="truncate text-muted-foreground text-sm">
              {chatData.title}
            </p>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-3xl space-y-4">
          {displayMessages.length === 0 && !isStreaming && (
            <div className="py-12 text-center text-muted-foreground">
              <Bot className="mx-auto mb-4 h-12 w-12 opacity-50" />
              <p>Ask a question about this document</p>
              <p className="text-sm">
                The AI will search through the file to find answers
              </p>
            </div>
          )}

          {displayMessages.map((message) => (
            <div
              className={cn(
                "flex gap-3",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
              key={message.id}
            >
              {message.role === "assistant" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[80%] rounded-lg px-4 py-2",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                {message.role === "assistant" ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <Markdown remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </Markdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap text-sm">
                    {message.content}
                  </p>
                )}
              </div>
              {message.role === "user" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary">
                  <User className="h-4 w-4 text-primary-foreground" />
                </div>
              )}
            </div>
          ))}

          {pendingMessage && (
            <div className="flex justify-end gap-3">
              <div className="max-w-[80%] rounded-lg bg-primary px-4 py-2 text-primary-foreground">
                <p className="whitespace-pre-wrap text-sm">{pendingMessage}</p>
              </div>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary">
                <User className="h-4 w-4 text-primary-foreground" />
              </div>
            </div>
          )}

          {isStreaming && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              {streamingContent ? (
                <div className="max-w-[80%] rounded-lg bg-muted px-4 py-2">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <Markdown remarkPlugins={[remarkGfm]}>
                      {streamingContent}
                    </Markdown>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-muted-foreground text-sm">
                    {statusMessage || "Thinking..."}
                  </span>
                </div>
              )}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t p-4">
        <form className="mx-auto max-w-3xl" onSubmit={handleSubmit}>
          <div className="flex gap-2">
            <Input
              autoFocus
              disabled={isStreaming}
              maxLength={2000}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about this document..."
              ref={inputRef}
              value={input}
            />
            <Button
              disabled={!input.trim() || isStreaming}
              size="icon"
              type="submit"
            >
              {isStreaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="mt-1 text-right text-muted-foreground text-xs">
            {input.length}/2000
          </div>
        </form>
      </div>
    </div>
  );
}
