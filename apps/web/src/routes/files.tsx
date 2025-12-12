import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FileList } from "@/components/files/file-list";
import { FileUploadDialog } from "@/components/files/file-upload-dialog";
import { useHotkeys } from "@/hooks/use-hotkeys";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/files")({
  component: FilesPage,
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

function FilesPage() {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  const hotkeys = useMemo(
    () => [
      {
        key: "u",
        ctrl: true,
        shift: true,
        callback: () => setUploadDialogOpen(true),
      },
    ],
    []
  );

  useHotkeys(hotkeys);

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-bold text-2xl md:text-3xl">Documents</h1>
        <FileUploadDialog
          onOpenChange={setUploadDialogOpen}
          open={uploadDialogOpen}
        />
      </div>
      <FileList />
    </div>
  );
}
