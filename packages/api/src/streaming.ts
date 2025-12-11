import {
  and,
  chat,
  chatMessage,
  count,
  DOCUMENTS_BUCKET,
  db,
  eq,
  file,
  supabaseAdmin,
} from "@xquery/db";
import { getOrCreateAssistant, openai } from "./lib/openai";

type StreamQuestionInput = {
  userId: string;
  chatId: string;
  question: string;
};

type StreamEvent =
  | { type: "status"; data: { message: string } }
  | { type: "delta"; data: { content: string } }
  | {
      type: "done";
      data: { userMessageId: string; assistantMessageId: string };
    }
  | { type: "error"; data: { message: string } };

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: streaming logic requires multiple conditional branches
export async function* streamQuestion(
  input: StreamQuestionInput
): AsyncGenerator<StreamEvent> {
  const { userId, chatId, question } = input;

  const chatResult = await db
    .select({
      id: chat.id,
      fileId: chat.fileId,
      openaiThreadId: chat.openaiThreadId,
      title: chat.title,
    })
    .from(chat)
    .where(and(eq(chat.id, chatId), eq(chat.userId, userId)))
    .limit(1);

  const chatRecord = chatResult[0];
  if (!chatRecord) {
    yield { type: "error", data: { message: "Chat not found" } };
    return;
  }

  const fileResult = await db
    .select()
    .from(file)
    .where(eq(file.id, chatRecord.fileId))
    .limit(1);

  const fileRecord = fileResult[0];
  if (!fileRecord) {
    yield { type: "error", data: { message: "File not found" } };
    return;
  }

  let openaiFileId = fileRecord.openaiFileId;

  if (!openaiFileId) {
    yield { type: "status", data: { message: "Uploading file to AI..." } };

    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from(DOCUMENTS_BUCKET)
      .download(fileRecord.storagePath);

    if (downloadError || !fileData) {
      yield {
        type: "error",
        data: { message: "Failed to download file from storage" },
      };
      return;
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
    chatId,
    role: "user",
    content: question,
  });

  const isFirstMessage = !chatRecord.title;
  if (isFirstMessage) {
    const title =
      question.length > 30 ? `${question.substring(0, 30)}...` : question;
    await db.update(chat).set({ title }).where(eq(chat.id, chatId));
  }

  yield { type: "status", data: { message: "Searching document..." } };

  const assistantId = await getOrCreateAssistant();

  const messageCount = await db
    .select({ count: count() })
    .from(chatMessage)
    .where(eq(chatMessage.chatId, chatId));

  const isFirstChatMessage = (messageCount[0]?.count ?? 0) <= 1;

  if (isFirstChatMessage) {
    await openai.beta.threads.messages.create(chatRecord.openaiThreadId, {
      role: "user",
      content: question,
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
      content: question,
    });
  }

  let fullContent = "";

  try {
    const stream = openai.beta.threads.runs.stream(chatRecord.openaiThreadId, {
      assistant_id: assistantId,
    });

    for await (const event of stream) {
      if (event.event === "thread.message.delta") {
        const delta = event.data.delta;
        if (delta.content) {
          for (const block of delta.content) {
            if (block.type === "text" && block.text?.value) {
              fullContent += block.text.value;
              yield { type: "delta", data: { content: block.text.value } };
            }
          }
        }
      } else if (event.event === "thread.run.failed") {
        const error = event.data.last_error;
        yield {
          type: "error",
          data: { message: error?.message || "Assistant run failed" },
        };
        return;
      }
    }
  } catch (streamError) {
    yield {
      type: "error",
      data: {
        message:
          streamError instanceof Error
            ? streamError.message
            : "Stream failed unexpectedly",
      },
    };
    return;
  }

  if (!fullContent) {
    yield {
      type: "error",
      data: { message: "No response received from assistant" },
    };
    return;
  }

  const assistantMessageId = crypto.randomUUID();
  await db.insert(chatMessage).values({
    id: assistantMessageId,
    chatId,
    role: "assistant",
    content: fullContent,
  });

  yield {
    type: "done",
    data: { userMessageId, assistantMessageId },
  };
}
