import { createFileRoute, redirect } from "@tanstack/react-router";
import { FileList } from "@/components/files/file-list";
import { FileUploadDialog } from "@/components/files/file-upload-dialog";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/files")({
  component: FilesPage,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      redirect({
        to: "/login",
        throw: true,
      });
    }
    return { session };
  },
});

function FilesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-bold text-3xl">Documents</h1>
        <FileUploadDialog />
      </div>
      <FileList />
    </div>
  );
}
