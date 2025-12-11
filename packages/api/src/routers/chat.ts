import { TRPCError } from "@trpc/server";
import {
  and,
  asc,
  chat,
  chatMessage,
  count,
  DOCUMENTS_BUCKET,
  db,
  desc,
  eq,
  file,
  ilike,
  or,
  supabaseAdmin,
} from "@xquery/db";
import { z } from "zod";
import { protectedProcedure, router } from "../index";
import { getOrCreateAssistant, openai } from "../lib/openai";

export const chatRouter = router({
  create: protectedProcedure
    .input(z.object({ fileId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const fileResult = await db
        .select()
        .from(file)
        .where(and(eq(file.id, input.fileId), eq(file.userId, userId)))
        .limit(1);

      const fileRecord = fileResult[0];
      if (!fileRecord) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "File not found",
        });
      }

      const thread = await openai.beta.threads.create();

      const chatId = crypto.randomUUID();
      await db.insert(chat).values({
        id: chatId,
        userId,
        fileId: input.fileId,
        openaiThreadId: thread.id,
      });

      return {
        chatId,
        fileId: input.fileId,
        fileName: fileRecord.name,
        title: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }),

  list: protectedProcedure
    .input(
      z
        .object({
          fileId: z.string().uuid().optional(),
          limit: z.number().int().min(1).max(100).default(50),
          offset: z.number().int().min(0).default(0),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;

      const whereConditions = input?.fileId
        ? and(eq(chat.userId, userId), eq(chat.fileId, input.fileId))
        : eq(chat.userId, userId);

      const chats = await db
        .select({
          id: chat.id,
          title: chat.title,
          fileId: chat.fileId,
          fileName: file.name,
          createdAt: chat.createdAt,
          updatedAt: chat.updatedAt,
        })
        .from(chat)
        .innerJoin(file, eq(chat.fileId, file.id))
        .where(whereConditions)
        .orderBy(desc(chat.updatedAt))
        .limit(limit)
        .offset(offset);

      const chatIds = chats.map((c) => c.id);
      const messageCounts =
        chatIds.length > 0
          ? await Promise.all(
              chatIds.map(async (chatId) => {
                const result = await db
                  .select({ count: count() })
                  .from(chatMessage)
                  .where(eq(chatMessage.chatId, chatId));
                return { chatId, count: result[0]?.count ?? 0 };
              })
            )
          : [];

      const countMap = new Map(
        messageCounts.map((mc) => [mc.chatId, mc.count])
      );

      return chats.map((c) => ({
        ...c,
        messageCount: countMap.get(c.id) ?? 0,
      }));
    }),

  search: protectedProcedure
    .input(
      z.object({
        fileId: z.string().uuid(),
        query: z.string().min(1).max(500),
        limit: z.number().int().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Sanitize query for LIKE pattern
      const sanitizedQuery = input.query
        .replace(/\\/g, "\\\\")
        .replace(/%/g, "\\%")
        .replace(/_/g, "\\_");

      // Search messages in chats for this file
      const matchingMessages = await db
        .select({
          messageId: chatMessage.id,
          chatId: chatMessage.chatId,
          role: chatMessage.role,
          content: chatMessage.content,
          messageCreatedAt: chatMessage.createdAt,
          chatTitle: chat.title,
          chatUpdatedAt: chat.updatedAt,
        })
        .from(chatMessage)
        .innerJoin(chat, eq(chatMessage.chatId, chat.id))
        .where(
          and(
            eq(chat.fileId, input.fileId),
            eq(chat.userId, userId),
            or(
              ilike(chatMessage.content, `%${sanitizedQuery}%`),
              ilike(chat.title, `%${sanitizedQuery}%`)
            )
          )
        )
        .orderBy(desc(chat.updatedAt), desc(chatMessage.createdAt))
        .limit(input.limit * 5);

      // Group by chat
      const chatMap = new Map<
        string,
        {
          id: string;
          title: string | null;
          updatedAt: Date;
          matchingMessages: Array<{
            id: string;
            role: "user" | "assistant";
            content: string;
            createdAt: Date;
          }>;
        }
      >();

      for (const msg of matchingMessages) {
        if (!chatMap.has(msg.chatId)) {
          chatMap.set(msg.chatId, {
            id: msg.chatId,
            title: msg.chatTitle,
            updatedAt: msg.chatUpdatedAt,
            matchingMessages: [],
          });
        }
        const chatEntry = chatMap.get(msg.chatId);
        if (chatEntry && chatEntry.matchingMessages.length < 5) {
          chatEntry.matchingMessages.push({
            id: msg.messageId,
            role: msg.role as "user" | "assistant",
            content: msg.content,
            createdAt: msg.messageCreatedAt,
          });
        }
      }

      return {
        chats: Array.from(chatMap.values()).slice(0, input.limit),
      };
    }),

  get: protectedProcedure
    .input(z.object({ chatId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const chatResult = await db
        .select({
          id: chat.id,
          title: chat.title,
          fileId: chat.fileId,
          fileName: file.name,
          openaiThreadId: chat.openaiThreadId,
          createdAt: chat.createdAt,
          updatedAt: chat.updatedAt,
        })
        .from(chat)
        .innerJoin(file, eq(chat.fileId, file.id))
        .where(and(eq(chat.id, input.chatId), eq(chat.userId, userId)))
        .limit(1);

      const chatRecord = chatResult[0];
      if (!chatRecord) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Chat not found",
        });
      }

      const messages = await db
        .select({
          id: chatMessage.id,
          role: chatMessage.role,
          content: chatMessage.content,
          createdAt: chatMessage.createdAt,
        })
        .from(chatMessage)
        .where(eq(chatMessage.chatId, input.chatId))
        .orderBy(asc(chatMessage.createdAt));

      return {
        ...chatRecord,
        messages,
      };
    }),

  delete: protectedProcedure
    .input(z.object({ chatId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const result = await db
        .delete(chat)
        .where(and(eq(chat.id, input.chatId), eq(chat.userId, userId)))
        .returning({ id: chat.id });

      if (result.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Chat not found",
        });
      }

      return { success: true };
    }),

  rename: protectedProcedure
    .input(
      z.object({
        chatId: z.string().uuid(),
        title: z.string().min(1).max(255),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const result = await db
        .update(chat)
        .set({ title: input.title })
        .where(and(eq(chat.id, input.chatId), eq(chat.userId, userId)))
        .returning({ id: chat.id });

      if (result.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Chat not found",
        });
      }

      return { success: true };
    }),

  askQuestion: protectedProcedure
    .input(
      z.object({
        chatId: z.string().uuid(),
        question: z.string().min(1).max(2000),
      })
    )
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: orchestrating OpenAI API requires multiple steps
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const chatResult = await db
        .select({
          id: chat.id,
          fileId: chat.fileId,
          openaiThreadId: chat.openaiThreadId,
          title: chat.title,
        })
        .from(chat)
        .where(and(eq(chat.id, input.chatId), eq(chat.userId, userId)))
        .limit(1);

      const chatRecord = chatResult[0];
      if (!chatRecord) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Chat not found",
        });
      }

      const fileResult = await db
        .select()
        .from(file)
        .where(eq(file.id, chatRecord.fileId))
        .limit(1);

      const fileRecord = fileResult[0];
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
          .where(eq(file.id, chatRecord.fileId));
      }

      const userMessageId = crypto.randomUUID();
      await db.insert(chatMessage).values({
        id: userMessageId,
        chatId: input.chatId,
        role: "user",
        content: input.question,
      });

      const isFirstMessage = !chatRecord.title;

      if (isFirstMessage) {
        const title =
          input.question.length > 50
            ? `${input.question.substring(0, 50)}...`
            : input.question;
        await db.update(chat).set({ title }).where(eq(chat.id, input.chatId));
      }

      const assistantId = await getOrCreateAssistant();

      const messageCount = await db
        .select({ count: count() })
        .from(chatMessage)
        .where(eq(chatMessage.chatId, input.chatId));

      const isFirstChatMessage = (messageCount[0]?.count ?? 0) <= 1;

      if (isFirstChatMessage) {
        await openai.beta.threads.messages.create(chatRecord.openaiThreadId, {
          role: "user",
          content: input.question,
          attachments: [
            {
              file_id: openaiFileId,
              tools: [{ type: "file_search" }],
            },
          ],
        });
      } else {
        await openai.beta.threads.messages.create(chatRecord.openaiThreadId, {
          role: "user",
          content: input.question,
        });
      }

      const run = await openai.beta.threads.runs.createAndPoll(
        chatRecord.openaiThreadId,
        {
          assistant_id: assistantId,
        }
      );

      if (run.status !== "completed") {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Assistant run failed with status: ${run.status}`,
        });
      }

      const messages = await openai.beta.threads.messages.list(
        chatRecord.openaiThreadId,
        {
          order: "desc",
          limit: 1,
        }
      );

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

      const assistantMessageId = crypto.randomUUID();
      await db.insert(chatMessage).values({
        id: assistantMessageId,
        chatId: input.chatId,
        role: "assistant",
        content: textContent.text.value,
      });

      return {
        answer: textContent.text.value,
        userMessageId,
        assistantMessageId,
      };
    }),

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
