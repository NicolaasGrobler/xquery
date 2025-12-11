import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { FileText, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export function FileUploadForm({ onSuccess }: { onSuccess?: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: async ({
      file,
      customName,
    }: {
      file: File;
      customName: string;
    }) => {
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
        name: customName || undefined,
      });

      return { fileId: uploadUrlResult.fileId };
    },
    onSuccess: () => {
      toast.success("File uploaded successfully");
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      queryClient.invalidateQueries({ queryKey: [["files", "list"]] });
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "Upload failed");
    },
  });

  const form = useForm({
    defaultValues: {
      customName: "",
    },
    onSubmit: async ({ value }) => {
      if (!selectedFile) {
        toast.error("Please select a file");
        return;
      }
      await uploadMutation.mutateAsync({
        file: selectedFile,
        customName: value.customName,
      });
    },
  });

  function handleFile(file: File) {
    const error = validateFile(file);
    if (error) {
      toast.error(error);
      return;
    }
    setSelectedFile(file);
    form.setFieldValue("customName", file.name.replace(/\.[^.]+$/, ""));
  }

  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      handleFile(file);
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

    const file = event.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }

  function clearSelectedFile() {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Document
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          {/* Hidden file input */}
          <input
            accept={ALLOWED_EXTENSIONS}
            className="hidden"
            disabled={uploadMutation.isPending}
            onChange={handleFileSelect}
            ref={fileInputRef}
            type="file"
          />

          {/* Dropzone */}
          {!selectedFile && (
            <button
              className={cn(
                "flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors",
                isDragActive
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
              )}
              disabled={uploadMutation.isPending}
              onClick={openFilePicker}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              type="button"
            >
              <Upload
                className={cn(
                  "mb-4 h-10 w-10",
                  isDragActive ? "text-primary" : "text-muted-foreground"
                )}
              />
              <p className="mb-1 font-medium text-sm">
                {isDragActive ? "Drop file here" : "Drag & drop your file here"}
              </p>
              <p className="text-muted-foreground text-sm">
                or click to browse
              </p>
              <p className="mt-2 text-muted-foreground text-xs">
                PDF, DOCX, TXT, MD (max 10 MB)
              </p>
            </button>
          )}

          {/* Selected file preview */}
          {selectedFile && (
            <div className="flex items-center justify-between rounded-md border bg-muted/50 p-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">{selectedFile.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
              </div>
              <Button
                disabled={uploadMutation.isPending}
                onClick={clearSelectedFile}
                size="sm"
                type="button"
                variant="ghost"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Custom name input */}
          {selectedFile && (
            <form.Field name="customName">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor="customName">Display Name (optional)</Label>
                  <Input
                    disabled={uploadMutation.isPending}
                    id="customName"
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Enter a custom name for this file"
                    value={field.state.value}
                  />
                </div>
              )}
            </form.Field>
          )}

          <Button
            className="w-full"
            disabled={!selectedFile || uploadMutation.isPending}
            type="submit"
          >
            {uploadMutation.isPending ? "Uploading..." : "Upload File"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
