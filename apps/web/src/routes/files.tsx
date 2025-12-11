import { createFileRoute, redirect } from "@tanstack/react-router";
import { FileList } from "@/components/files/file-list";
import { FileUploadForm } from "@/components/files/file-upload-form";
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
      <h1 className="mb-8 font-bold text-3xl">Documents</h1>
      <div className="grid gap-6 md:grid-cols-[400px_1fr]">
        <div>
          <FileUploadForm />
        </div>
        <div>
          <FileList />
        </div>
      </div>
    </div>
  );
}
