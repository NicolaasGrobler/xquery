import { TRPCError } from "@trpc/server";
import { and, DOCUMENTS_BUCKET, db, eq, file, supabaseAdmin } from "@xquery/db";
import { z } from "zod";
import { protectedProcedure, router } from "../index";
import { ASSISTANT_INSTRUCTIONS, ASSISTANT_MODEL, openai } from "../lib/openai";

export const chatRouter = router({
  syncFileToOpenAI: protectedProcedure
    .input(z.object({ fileId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
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

      if (fileRecord.openaiFileId) {
        return { openaiFileId: fileRecord.openaiFileId, alreadySynced: true };
      }

      const { data: fileData, error: downloadError } =
        await supabaseAdmin.storage
          .from(DOCUMENTS_BUCKET)
          .download(fileRecord.storagePath);

      if (downloadError || !fileData) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to download file from storage",
        });
      }

      const openaiFile = await openai.files.create({
        file: new File([fileData], fileRecord.originalFilename, {
          type: fileRecord.mimeType,
        }),
        purpose: "assistants",
      });

      await db
        .update(file)
        .set({ openaiFileId: openaiFile.id })
        .where(eq(file.id, input.fileId));

      return { openaiFileId: openaiFile.id, alreadySynced: false };
    }),

  askQuestion: protectedProcedure
    .input(
      z.object({
        fileId: z.string().uuid(),
        question: z.string().min(1).max(2000),
        threadId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
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

      let openaiFileId = fileRecord.openaiFileId;

      if (!openaiFileId) {
        const { data: fileData, error: downloadError } =
          await supabaseAdmin.storage
            .from(DOCUMENTS_BUCKET)
            .download(fileRecord.storagePath);

        if (downloadError || !fileData) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to download file from storage",
          });
        }

        const openaiFile = await openai.files.create({
          file: new File([fileData], fileRecord.originalFilename, {
            type: fileRecord.mimeType,
          }),
          purpose: "assistants",
        });

        openaiFileId = openaiFile.id;

        await db
          .update(file)
          .set({ openaiFileId })
          .where(eq(file.id, input.fileId));
      }

      const assistant = await openai.beta.assistants.create({
        name: "Document Assistant",
        instructions: ASSISTANT_INSTRUCTIONS,
        model: ASSISTANT_MODEL,
        tools: [{ type: "file_search" }],
      });

      const thread = input.threadId
        ? await openai.beta.threads.retrieve(input.threadId)
        : await openai.beta.threads.create({
            messages: [
              {
                role: "user",
                content: input.question,
                attachments: [
                  {
                    file_id: openaiFileId,
                    tools: [{ type: "file_search" }],
                  },
                ],
              },
            ],
          });

      if (input.threadId) {
        await openai.beta.threads.messages.create(thread.id, {
          role: "user",
          content: input.question,
        });
      }

      const run = await openai.beta.threads.runs.createAndPoll(thread.id, {
        assistant_id: assistant.id,
      });

      if (run.status !== "completed") {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Assistant run failed with status: ${run.status}`,
        });
      }

      const messages = await openai.beta.threads.messages.list(thread.id, {
        order: "desc",
        limit: 1,
      });

      const assistantMessage = messages.data[0];
      if (!assistantMessage || assistantMessage.role !== "assistant") {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "No assistant response found",
        });
      }

      const textContent = assistantMessage.content.find(
        (c) => c.type === "text"
      );
      if (!textContent || textContent.type !== "text") {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "No text content in response",
        });
      }

      await openai.beta.assistants.delete(assistant.id);

      return {
        answer: textContent.text.value,
        threadId: thread.id,
      };
    }),

  getFileStatus: protectedProcedure
    .input(z.object({ fileId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const result = await db
        .select({ openaiFileId: file.openaiFileId })
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

      return { synced: !!fileRecord.openaiFileId };
    }),
});
