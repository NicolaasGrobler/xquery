import { useMutation } from "@tanstack/react-query";
import { Bot, Loader2, Send, User } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { trpcClient } from "@/utils/trpc";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type FileChatDialogProps = {
  file: {
    id: string;
    name: string;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function FileChatDialog({
  file,
  onOpenChange,
  open,
}: FileChatDialogProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [threadId, setThreadId] = useState<string | undefined>(undefined);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const askMutation = useMutation({
    mutationFn: ({
      fileId,
      question,
      currentThreadId,
    }: {
      fileId: string;
      question: string;
      currentThreadId?: string;
    }) =>
      trpcClient.chat.askQuestion.mutate({
        fileId,
        question,
        threadId: currentThreadId,
      }),
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", content: data.answer },
      ]);
      setThreadId(data.threadId);
      scrollToBottom();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to get response");
      setMessages((prev) => prev.slice(0, -1));
    },
  });

  function scrollToBottom() {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const canSubmit = input.trim() && file && !askMutation.isPending;
    if (!canSubmit) {
      return;
    }

    const question = input.trim();
    setInput("");
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content: question },
    ]);
    scrollToBottom();

    askMutation.mutate({
      fileId: file.id,
      question,
      currentThreadId: threadId,
    });
  }

  function handleOpenChange(newOpen: boolean) {
    if (!newOpen) {
      setMessages([]);
      setInput("");
      setThreadId(undefined);
    }
    onOpenChange(newOpen);
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="flex max-h-[80vh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Ask AI about: {file?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages.length === 0 && (
              <div className="py-8 text-center text-muted-foreground">
                <Bot className="mx-auto mb-4 h-12 w-12 opacity-50" />
                <p>Ask a question about this document</p>
                <p className="text-sm">
                  The AI will search through the file to find answers
                </p>
              </div>
            )}

            {messages.map((message) => (
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
                  <p className="whitespace-pre-wrap text-sm">
                    {message.content}
                  </p>
                </div>
                {message.role === "user" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary">
                    <User className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))}

            {askMutation.isPending && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-muted-foreground text-sm">
                    Searching document...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <form className="flex gap-2 border-t p-4" onSubmit={handleSubmit}>
            <Input
              autoFocus
              disabled={askMutation.isPending}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about this document..."
              value={input}
            />
            <Button
              disabled={!input.trim() || askMutation.isPending}
              size="icon"
              type="submit"
            >
              {askMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
