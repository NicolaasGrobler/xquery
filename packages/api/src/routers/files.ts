import { TRPCError } from "@trpc/server";
import {
  ALLOWED_MIME_TYPES,
  and,
  DOCUMENTS_BUCKET,
  db,
  desc,
  eq,
  file,
  MAX_FILE_SIZE,
  supabaseAdmin,
} from "@xquery/db";
import { z } from "zod";
import { protectedProcedure, router } from "../index";

const mimeTypeSchema = z.enum(ALLOWED_MIME_TYPES);

const createUploadUrlSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: mimeTypeSchema,
  size: z.number().int().positive().max(MAX_FILE_SIZE),
});

const confirmUploadSchema = z.object({
  fileId: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
});

export const filesRouter = router({
  createUploadUrl: protectedProcedure
    .input(createUploadUrlSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const fileId = crypto.randomUUID();
      const fileExtension = input.filename.split(".").pop() || "";
      const storagePath = `${userId}/${fileId}.${fileExtension}`;

      const { data, error } = await supabaseAdmin.storage
        .from(DOCUMENTS_BUCKET)
        .createSignedUploadUrl(storagePath);

      if (error || !data) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create upload URL",
          cause: error,
        });
      }

      await db.insert(file).values({
        id: fileId,
        userId,
        name: input.filename,
        originalFilename: input.filename,
        mimeType: input.mimeType,
        size: input.size,
        storagePath,
      });

      return {
        fileId,
        uploadUrl: data.signedUrl,
        token: data.token,
        path: storagePath,
      };
    }),

  confirmUpload: protectedProcedure
    .input(confirmUploadSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const existingFile = await db
        .select()
        .from(file)
        .where(and(eq(file.id, input.fileId), eq(file.userId, userId)))
        .limit(1);

      const fileRecord = existingFile[0];
      if (!fileRecord) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "File not found",
        });
      }

      const fileName = fileRecord.storagePath.split("/").pop();

      const { data: storageFiles, error } = await supabaseAdmin.storage
        .from(DOCUMENTS_BUCKET)
        .list(userId, {
          search: fileName,
        });

      if (error || !storageFiles || storageFiles.length === 0) {
        await db.delete(file).where(eq(file.id, input.fileId));
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Upload not completed or file not found in storage",
        });
      }

      if (input.name) {
        await db
          .update(file)
          .set({ name: input.name })
          .where(eq(file.id, input.fileId));
      }

      return { success: true, fileId: input.fileId };
    }),

  list: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(100).default(20),
          offset: z.number().int().min(0).default(0),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const limit = input?.limit ?? 20;
      const offset = input?.offset ?? 0;

      const files = await db
        .select({
          id: file.id,
          name: file.name,
          originalFilename: file.originalFilename,
          mimeType: file.mimeType,
          size: file.size,
          createdAt: file.createdAt,
        })
        .from(file)
        .where(eq(file.userId, userId))
        .orderBy(desc(file.createdAt))
        .limit(limit)
        .offset(offset);

      return files;
    }),

  get: protectedProcedure
    .input(z.object({ fileId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const result = await db
        .select()
        .from(file)
        .where(and(eq(file.id, input.fileId), eq(file.userId, userId)))
        .limit(1);

      const fileRecord = result[0];
      if (!fileRecord) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "File not found",
        });
      }

      return fileRecord;
    }),

  getDownloadUrl: protectedProcedure
    .input(z.object({ fileId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const result = await db
        .select({ storagePath: file.storagePath })
        .from(file)
        .where(and(eq(file.id, input.fileId), eq(file.userId, userId)))
        .limit(1);

      const fileRecord = result[0];
      if (!fileRecord) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "File not found",
        });
      }

      const { data, error } = await supabaseAdmin.storage
        .from(DOCUMENTS_BUCKET)
        .createSignedUrl(fileRecord.storagePath, 60 * 5);

      if (error || !data) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create download URL",
        });
      }

      return { url: data.signedUrl };
    }),

  delete: protectedProcedure
    .input(z.object({ fileId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const result = await db
        .select({ storagePath: file.storagePath })
        .from(file)
        .where(and(eq(file.id, input.fileId), eq(file.userId, userId)))
        .limit(1);

      const fileRecord = result[0];
      if (!fileRecord) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "File not found",
        });
      }

      const { error: storageError } = await supabaseAdmin.storage
        .from(DOCUMENTS_BUCKET)
        .remove([fileRecord.storagePath]);

      if (storageError) {
        console.error("Storage deletion error:", storageError);
      }

      await db.delete(file).where(eq(file.id, input.fileId));

      return { success: true };
    }),

  rename: protectedProcedure
    .input(
      z.object({
        fileId: z.string().uuid(),
        name: z.string().min(1).max(255),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const result = await db
        .update(file)
        .set({ name: input.name })
        .where(and(eq(file.id, input.fileId), eq(file.userId, userId)))
        .returning({ id: file.id });

      if (result.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "File not found",
        });
      }

      return { success: true };
    }),
});
