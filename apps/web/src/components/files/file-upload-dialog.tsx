import { useMutation } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle,
  FileText,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { queryClient, trpcClient } from "@/utils/trpc";

const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
];

const MAX_SIZE = 10 * 1024 * 1024;

const ALLOWED_EXTENSIONS = ".pdf,.docx,.txt,.md";

type FileStatus = "pending" | "uploading" | "done" | "error";

type SelectedFile = {
  id: string;
  file: File;
  status: FileStatus;
  error?: string;
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

function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return "Invalid file type. Allowed: PDF, DOCX, TXT, MD";
  }
  if (file.size > MAX_SIZE) {
    return "File too large. Maximum size: 10 MB";
  }
  return null;
}

function getFileTypeIcon(_mimeType: string) {
  return <FileText className="h-4 w-4 text-muted-foreground" />;
}

function FileStatusIcon({ status }: { status: FileStatus }) {
  switch (status) {
    case "uploading":
      return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
    case "done":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "error":
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    default:
      return null;
  }
}

type FileUploadDialogProps = {
  onSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function FileUploadDialog({
  onSuccess,
  open: controlledOpen,
  onOpenChange,
}: FileUploadDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [internalOpen, setInternalOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const uploadUrlResult = await trpcClient.files.createUploadUrl.mutate({
        filename: file.name,
        mimeType: file.type as
          | "application/pdf"
          | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          | "text/plain"
          | "text/markdown",
        size: file.size,
      });

      const response = await fetch(uploadUrlResult.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      await trpcClient.files.confirmUpload.mutate({
        fileId: uploadUrlResult.fileId,
      });

      return { fileId: uploadUrlResult.fileId };
    },
  });

  function handleFiles(files: FileList | File[]) {
    const fileArray = Array.from(files);
    const newSelectedFiles: SelectedFile[] = [];

    for (const file of fileArray) {
      const error = validateFile(file);
      if (error) {
        toast.error(`${file.name}: ${error}`);
        continue;
      }

      const existingFile = selectedFiles.find(
        (sf) => sf.file.name === file.name && sf.file.size === file.size
      );
      if (existingFile) {
        continue;
      }

      newSelectedFiles.push({
        id: crypto.randomUUID(),
        file,
        status: "pending",
      });
    }

    if (newSelectedFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...newSelectedFiles]);
    }
  }

  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (files) {
      handleFiles(files);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleDragEnter(event: React.DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(true);
  }

  function handleDragLeave(event: React.DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(false);
  }

  function handleDragOver(event: React.DragEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(false);

    const files = event.dataTransfer.files;
    if (files.length > 0) {
      handleFiles(files);
    }
  }

  function removeFile(id: string) {
    setSelectedFiles((prev) => prev.filter((f) => f.id !== id));
  }

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function updateFileStatus(
    fileId: string,
    status: FileStatus,
    error?: string
  ) {
    setSelectedFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, status, error } : f))
    );
  }

  async function uploadSingleFile(selectedFile: SelectedFile) {
    updateFileStatus(selectedFile.id, "uploading");
    try {
      await uploadMutation.mutateAsync(selectedFile.file);
      updateFileStatus(selectedFile.id, "done");
      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Upload failed";
      updateFileStatus(selectedFile.id, "error", errorMessage);
      return false;
    }
  }

  function showUploadResult(successCount: number, errorCount: number) {
    if (successCount > 0 && errorCount === 0) {
      const plural = successCount > 1 ? "s" : "";
      toast.success(`${successCount} file${plural} uploaded successfully`);
      setSelectedFiles([]);
      setOpen(false);
      onSuccess?.();
    } else if (successCount > 0) {
      toast.warning(
        `${successCount} uploaded, ${errorCount} failed. Check errors and retry.`
      );
    } else {
      toast.error("All uploads failed");
    }
  }

  async function uploadAllFiles() {
    if (selectedFiles.length === 0 || isUploading) {
      return;
    }

    setIsUploading(true);
    let successCount = 0;
    let errorCount = 0;

    for (const selectedFile of selectedFiles) {
      if (selectedFile.status === "done") {
        successCount += 1;
        continue;
      }

      const success = await uploadSingleFile(selectedFile);
      if (success) {
        successCount += 1;
      } else {
        errorCount += 1;
      }
    }

    setIsUploading(false);
    queryClient.invalidateQueries({ queryKey: [["files", "list"]] });
    showUploadResult(successCount, errorCount);
  }

  function handleOpenChange(newOpen: boolean) {
    if (!newOpen && isUploading) {
      return;
    }
    if (!newOpen) {
      setSelectedFiles([]);
    }
    setOpen(newOpen);
  }

  const pendingCount = selectedFiles.filter(
    (f) => f.status === "pending" || f.status === "error"
  ).length;

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto">
          <Upload className="mr-2 h-4 w-4" />
          Upload Documents
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Documents</DialogTitle>
          <DialogDescription>
            Upload PDF, DOCX, TXT, or MD files (max 10 MB each)
          </DialogDescription>
        </DialogHeader>

        <input
          accept={ALLOWED_EXTENSIONS}
          className="hidden"
          disabled={isUploading}
          multiple
          onChange={handleFileSelect}
          ref={fileInputRef}
          type="file"
        />

        <button
          className={cn(
            "flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors",
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
            isUploading && "cursor-not-allowed opacity-50"
          )}
          disabled={isUploading}
          onClick={openFilePicker}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          type="button"
        >
          <Upload
            className={cn(
              "mb-3 h-8 w-8",
              isDragActive ? "text-primary" : "text-muted-foreground"
            )}
          />
          <p className="mb-1 font-medium text-sm">
            {isDragActive ? "Drop files here" : "Drag & drop files here"}
          </p>
          <p className="text-muted-foreground text-sm">or click to browse</p>
        </button>

        {selectedFiles.length > 0 && (
          <div className="space-y-2">
            <p className="font-medium text-sm">
              Selected Files ({selectedFiles.length}):
            </p>
            <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border p-2">
              {selectedFiles.map((sf) => (
                <div
                  className={cn(
                    "flex items-center justify-between rounded-md bg-muted/50 p-2 text-sm",
                    sf.status === "error" && "bg-destructive/10"
                  )}
                  key={sf.id}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    {getFileTypeIcon(sf.file.type)}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{sf.file.name}</p>
                      <p className="text-muted-foreground text-xs">
                        {formatFileSize(sf.file.size)}
                        {sf.error && (
                          <span className="ml-2 text-destructive">
                            {sf.error}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="ml-2 flex items-center gap-2">
                    <FileStatusIcon status={sf.status} />
                    {sf.status !== "uploading" && sf.status !== "done" && (
                      <Button
                        className="h-6 w-6 p-0"
                        disabled={isUploading}
                        onClick={() => removeFile(sf.id)}
                        size="sm"
                        type="button"
                        variant="ghost"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            disabled={isUploading}
            onClick={() => handleOpenChange(false)}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            disabled={pendingCount === 0 || isUploading}
            onClick={uploadAllFiles}
            type="button"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              `Upload ${pendingCount > 0 ? pendingCount : ""} File${pendingCount !== 1 ? "s" : ""}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
