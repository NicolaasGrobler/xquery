import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "http://127.0.0.1:54321";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || "";

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export const DOCUMENTS_BUCKET = "documents";

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
] as const;

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export async function ensureDocumentsBucketExists() {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();

  const bucketExists = buckets?.some(
    (bucket) => bucket.name === DOCUMENTS_BUCKET
  );

  if (!bucketExists) {
    const { error } = await supabaseAdmin.storage.createBucket(
      DOCUMENTS_BUCKET,
      {
        public: false,
        fileSizeLimit: MAX_FILE_SIZE,
        allowedMimeTypes: [...ALLOWED_MIME_TYPES],
      }
    );

    if (error) {
      console.error("Failed to create documents bucket:", error);
      throw error;
    }

    console.log("Created documents storage bucket");
  }
}
