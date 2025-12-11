import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  Download,
  Files,
  FileText,
  MessageSquare,
  MoreVertical,
  Pencil,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { queryClient, trpc, trpcClient } from "@/utils/trpc";

const FILE_TYPE_LABELS: Record<string, string> = {
  "application/pdf": "PDF",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "DOCX",
  "text/plain": "TXT",
  "text/markdown": "MD",
};

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

export function FileList() {
  const navigate = useNavigate();
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [fileToRename, setFileToRename] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [newName, setNewName] = useState("");

  const filesQuery = useQuery(trpc.files.list.queryOptions({ limit: 50 }));
  const chatsQuery = useQuery(trpc.chat.list.queryOptions({}));

  const chatsByFileId = new Map<string, string>();
  for (const chat of chatsQuery.data ?? []) {
    if (!chatsByFileId.has(chat.fileId)) {
      chatsByFileId.set(chat.fileId, chat.id);
    }
  }

  const renameMutation = useMutation({
    mutationFn: ({ fileId, name }: { fileId: string; name: string }) =>
      trpcClient.files.rename.mutate({ fileId, name }),
    onSuccess: () => {
      toast.success("File renamed");
      queryClient.invalidateQueries({ queryKey: [["files", "list"]] });
      setRenameDialogOpen(false);
      setFileToRename(null);
      setNewName("");
    },
    onError: () => {
      toast.error("Failed to rename file");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (fileId: string) => trpcClient.files.delete.mutate({ fileId }),
    onSuccess: () => {
      toast.success("File deleted");
      queryClient.invalidateQueries({ queryKey: [["files", "list"]] });
    },
    onError: () => {
      toast.error("Failed to delete file");
    },
  });

  const downloadMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const result = await trpcClient.files.getDownloadUrl.mutate({ fileId });
      return result.url;
    },
    onSuccess: (url) => {
      window.open(url, "_blank");
    },
    onError: () => {
      toast.error("Failed to get download link");
    },
  });

  const createChatMutation = useMutation({
    mutationFn: (fileId: string) => trpcClient.chat.create.mutate({ fileId }),
    onSuccess: (data) => {
      queryClient.setQueryData(
        [["chat", "get"], { input: { chatId: data.chatId }, type: "query" }],
        {
          id: data.chatId,
          fileId: data.fileId,
          fileName: data.fileName,
          title: data.title,
          messages: [],
        }
      );
      queryClient.setQueryData(
        [["chat", "list"], { input: { fileId: data.fileId }, type: "query" }],
        [
          {
            id: data.chatId,
            title: data.title,
            updatedAt: data.updatedAt,
          },
        ]
      );
      navigate({ to: "/chat/$chatId", params: { chatId: data.chatId } });
    },
    onError: (error) => {
      console.error("Failed to start chat:", error);
      toast.error("Failed to start chat");
    },
  });

  function openRenameDialog(file: { id: string; name: string }) {
    setFileToRename(file);
    setNewName(file.name);
    setRenameDialogOpen(true);
  }

  function handleRenameSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!(fileToRename && newName.trim())) {
      return;
    }
    renameMutation.mutate({ fileId: fileToRename.id, name: newName.trim() });
  }

  if (filesQuery.isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Files className="h-5 w-5" />
            Your Files
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (filesQuery.error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Failed to load files. Please try again.
        </CardContent>
      </Card>
    );
  }

  const files = filesQuery.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Files className="h-5 w-5" />
          Your Files ({files.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {files.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <FileText className="mx-auto mb-4 h-12 w-12 opacity-50" />
            <p>No files uploaded yet</p>
            <p className="text-sm">Upload your first document to get started</p>
          </div>
        ) : (
          <div className="space-y-2">
            {files.map((file) => (
              <div
                className="flex items-center justify-between rounded-md border p-3 transition-colors hover:bg-muted/50"
                key={file.id}
              >
                <button
                  className="flex flex-1 cursor-pointer items-center gap-3 text-left"
                  onClick={() => {
                    const existingChatId = chatsByFileId.get(file.id);
                    if (existingChatId) {
                      navigate({
                        to: "/chat/$chatId",
                        params: { chatId: existingChatId },
                      });
                    } else {
                      createChatMutation.mutate(file.id);
                    }
                  }}
                  type="button"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 font-medium text-primary text-xs">
                    {FILE_TYPE_LABELS[file.mimeType] || "FILE"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{file.name}</p>
                      {file.openaiFileId && (
                        <Sparkles
                          className="h-3 w-3 text-amber-500"
                          title="Synced to AI"
                        />
                      )}
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {formatFileSize(file.size)} &middot;{" "}
                      {formatDate(file.createdAt)}
                    </p>
                  </div>
                </button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="ghost">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      disabled={downloadMutation.isPending}
                      onClick={() => downloadMutation.mutate(file.id)}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        openRenameDialog({ id: file.id, name: file.name })
                      }
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Rename
                    </DropdownMenuItem>
                    {chatsByFileId.has(file.id) ? (
                      <DropdownMenuItem
                        onClick={() => {
                          const chatId = chatsByFileId.get(file.id);
                          if (chatId) {
                            navigate({
                              to: "/chat/$chatId",
                              params: { chatId },
                            });
                          }
                        }}
                      >
                        <MessageSquare className="mr-2 h-4 w-4" />
                        View Chats
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        disabled={createChatMutation.isPending}
                        onClick={() => createChatMutation.mutate(file.id)}
                      >
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Start Chat
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      disabled={deleteMutation.isPending}
                      onClick={() => deleteMutation.mutate(file.id)}
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
      </CardContent>

      <Dialog onOpenChange={setRenameDialogOpen} open={renameDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename File</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRenameSubmit}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rename-input">Name</Label>
                <Input
                  autoFocus
                  disabled={renameMutation.isPending}
                  id="rename-input"
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Enter file name"
                  value={newName}
                />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button
                disabled={renameMutation.isPending}
                onClick={() => setRenameDialogOpen(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                disabled={!newName.trim() || renameMutation.isPending}
                type="submit"
              >
                {renameMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
