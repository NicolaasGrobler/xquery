import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  Download,
  Files,
  FileText,
  Info,
  MessageSquare,
  MoreVertical,
  Pencil,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { staggerContainerVariants, staggerItemVariants } from "@/lib/motion";
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

type FileItemProps = {
  file: {
    id: string;
    name: string;
    mimeType: string;
    size: number;
    createdAt: Date | string;
    openaiFileId: string | null;
  };
  existingChatId?: string;
  onRename: (file: { id: string; name: string }) => void;
  onDelete: (file: { id: string; name: string }) => void;
  onViewDetails: (fileId: string) => void;
  onDownload: (fileId: string) => void;
  onStartChat: (fileId: string) => void;
  onViewChat: (chatId: string) => void;
  isDownloading: boolean;
  isCreatingChat: boolean;
};

function FileItem({
  file,
  existingChatId,
  onRename,
  onDelete,
  onViewDetails,
  onDownload,
  onStartChat,
  onViewChat,
  isDownloading,
  isCreatingChat,
}: FileItemProps) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border p-2 transition-colors hover:bg-muted/50 sm:gap-3 sm:p-3">
      <button
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left sm:gap-3"
        onClick={() => {
          if (existingChatId) {
            onViewChat(existingChatId);
          } else {
            onStartChat(file.id);
          }
        }}
        type="button"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 font-medium text-primary text-xs sm:h-10 sm:w-10">
          {FILE_TYPE_LABELS[file.mimeType] || "FILE"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium text-sm sm:text-base">
              {file.name}
            </p>
            {file.openaiFileId && (
              <span className="shrink-0" title="Synced to AI">
                <Sparkles className="h-3 w-3 text-amber-500" />
              </span>
            )}
          </div>
          <p className="truncate text-muted-foreground text-xs">
            {formatFileSize(file.size)} &middot; {formatDate(file.createdAt)}
          </p>
        </div>
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="shrink-0" size="sm" variant="ghost">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            disabled={isDownloading}
            onClick={() => onDownload(file.id)}
          >
            <Download className="mr-2 h-4 w-4" />
            Download
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onRename({ id: file.id, name: file.name })}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onViewDetails(file.id)}>
            <Info className="mr-2 h-4 w-4" />
            View Details
          </DropdownMenuItem>
          {existingChatId ? (
            <DropdownMenuItem onClick={() => onViewChat(existingChatId)}>
              <MessageSquare className="mr-2 h-4 w-4" />
              View Chats
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              disabled={isCreatingChat}
              onClick={() => onStartChat(file.id)}
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Start Chat
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={() => onDelete({ id: file.id, name: file.name })}
            variant="destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

type RenameDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileName: string;
  onNameChange: (name: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
};

function RenameDialog({
  open,
  onOpenChange,
  fileName,
  onNameChange,
  onSubmit,
  isPending,
}: RenameDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rename File</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rename-input">Name</Label>
              <Input
                autoFocus
                disabled={isPending}
                id="rename-input"
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="Enter file name"
                value={fileName}
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button
              disabled={isPending}
              onClick={() => onOpenChange(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={!fileName.trim() || isPending} type="submit">
              {isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type FileDetailsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: {
    id: string;
    name: string;
    originalFilename: string;
    mimeType: string;
    size: number;
    createdAt: Date | string;
    openaiFileId: string | null;
  } | null;
  isLoading: boolean;
};

function FileDetailsDialog({
  open,
  onOpenChange,
  file,
  isLoading,
}: FileDetailsDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>File Details</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
          </div>
        ) : file ? (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">{file.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Original Filename</span>
              <span className="font-medium">{file.originalFilename}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type</span>
              <span className="font-medium">
                {FILE_TYPE_LABELS[file.mimeType] || file.mimeType}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Size</span>
              <span className="font-medium">{formatFileSize(file.size)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Uploaded</span>
              <span className="font-medium">{formatDate(file.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">AI Sync Status</span>
              <span className="font-medium">
                {file.openaiFileId ? (
                  <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                    <Sparkles className="h-3 w-3" />
                    Synced
                  </span>
                ) : (
                  <span className="text-muted-foreground">Not synced</span>
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">File ID</span>
              <span className="font-medium font-mono text-xs">{file.id}</span>
            </div>
          </div>
        ) : null}
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type DeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileName: string | undefined;
  onConfirm: () => void;
  isPending: boolean;
};

function DeleteDialog({
  open,
  onOpenChange,
  fileName,
  onConfirm,
  isPending,
}: DeleteDialogProps) {
  return (
    <AlertDialog
      onOpenChange={(newOpen) => {
        if (!isPending) {
          onOpenChange(newOpen);
        }
      }}
      open={open}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete File</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{fileName}"? This action cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={isPending} onClick={onConfirm}>
            {isPending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function FileList() {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [fileToRename, setFileToRename] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [newName, setNewName] = useState("");
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [fileToView, setFileToView] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const fileDetailsQuery = useQuery({
    ...trpc.files.get.queryOptions({ fileId: fileToView ?? "" }),
    enabled: !!fileToView && detailsDialogOpen,
  });

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
      setDeleteDialogOpen(false);
      setFileToDelete(null);
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
      window.open(url, "_blank", "noopener,noreferrer");
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
      queryClient.invalidateQueries({ queryKey: [["chat", "list"]] });
      navigate({ to: "/chat/$chatId", params: { chatId: data.chatId } });
    },
    onError: (error) => {
      console.error("Failed to start chat:", error);
      toast.error("Failed to start chat");
    },
  });

  const handleOpenRenameDialog = (file: { id: string; name: string }) => {
    setFileToRename(file);
    setNewName(file.name);
    setRenameDialogOpen(true);
  };

  const handleOpenDetailsDialog = (fileId: string) => {
    setFileToView(fileId);
    setDetailsDialogOpen(true);
  };

  const handleOpenDeleteDialog = (file: { id: string; name: string }) => {
    setFileToDelete(file);
    setDeleteDialogOpen(true);
  };

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (fileToRename && newName.trim()) {
      renameMutation.mutate({ fileId: fileToRename.id, name: newName.trim() });
    }
  };

  const handleDetailsDialogChange = (open: boolean) => {
    setDetailsDialogOpen(open);
    if (!open) {
      setFileToView(null);
    }
  };

  const handleDeleteDialogChange = (open: boolean) => {
    setDeleteDialogOpen(open);
    if (!open) {
      setFileToDelete(null);
    }
  };

  const handleViewChat = (chatId: string) => {
    navigate({ to: "/chat/$chatId", params: { chatId } });
  };

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
          <motion.div
            animate="visible"
            className="space-y-2"
            initial={prefersReducedMotion ? false : "hidden"}
            variants={
              prefersReducedMotion ? undefined : staggerContainerVariants
            }
          >
            <AnimatePresence mode="popLayout">
              {files.map((file) => (
                <motion.div
                  exit={
                    prefersReducedMotion
                      ? undefined
                      : { opacity: 0, x: -20, transition: { duration: 0.15 } }
                  }
                  key={file.id}
                  layout={!prefersReducedMotion}
                  variants={
                    prefersReducedMotion ? undefined : staggerItemVariants
                  }
                >
                  <FileItem
                    existingChatId={chatsByFileId.get(file.id)}
                    file={file}
                    isCreatingChat={createChatMutation.isPending}
                    isDownloading={downloadMutation.isPending}
                    onDelete={handleOpenDeleteDialog}
                    onDownload={(fileId) => downloadMutation.mutate(fileId)}
                    onRename={handleOpenRenameDialog}
                    onStartChat={(fileId) => createChatMutation.mutate(fileId)}
                    onViewChat={handleViewChat}
                    onViewDetails={handleOpenDetailsDialog}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </CardContent>

      <RenameDialog
        fileName={newName}
        isPending={renameMutation.isPending}
        onNameChange={setNewName}
        onOpenChange={setRenameDialogOpen}
        onSubmit={handleRenameSubmit}
        open={renameDialogOpen}
      />

      <FileDetailsDialog
        file={fileDetailsQuery.data ?? null}
        isLoading={fileDetailsQuery.isLoading}
        onOpenChange={handleDetailsDialogChange}
        open={detailsDialogOpen}
      />

      <DeleteDialog
        fileName={fileToDelete?.name}
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          if (fileToDelete) {
            deleteMutation.mutate(fileToDelete.id);
          }
        }}
        onOpenChange={handleDeleteDialogChange}
        open={deleteDialogOpen}
      />
    </Card>
  );
}
