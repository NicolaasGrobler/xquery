import { relations } from "drizzle-orm";
import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { file } from "./files";

export const chat = pgTable(
  "chat",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    fileId: text("file_id")
      .notNull()
      .references(() => file.id, { onDelete: "cascade" }),

    title: text("title"),
    openaiThreadId: text("openai_thread_id").notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("chat_userId_idx").on(table.userId),
    index("chat_fileId_idx").on(table.fileId),
    index("chat_createdAt_idx").on(table.createdAt),
  ]
);

export const chatMessage = pgTable(
  "chat_message",
  {
    id: text("id").primaryKey(),
    chatId: text("chat_id")
      .notNull()
      .references(() => chat.id, { onDelete: "cascade" }),

    role: text("role", { enum: ["user", "assistant"] }).notNull(),
    content: text("content").notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("chatMessage_chatId_idx").on(table.chatId),
    index("chatMessage_createdAt_idx").on(table.createdAt),
  ]
);

export const chatRelations = relations(chat, ({ one, many }) => ({
  user: one(user, {
    fields: [chat.userId],
    references: [user.id],
  }),
  file: one(file, {
    fields: [chat.fileId],
    references: [file.id],
  }),
  messages: many(chatMessage),
}));

export const chatMessageRelations = relations(chatMessage, ({ one }) => ({
  chat: one(chat, {
    fields: [chatMessage.chatId],
    references: [chat.id],
  }),
}));
