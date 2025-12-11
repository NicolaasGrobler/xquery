import "dotenv/config";
import { trpcServer } from "@hono/trpc-server";
import { createContext } from "@xquery/api/context";
import { appRouter } from "@xquery/api/routers/index";
import { streamQuestion } from "@xquery/api/streaming";
import { auth } from "@xquery/auth";
import { ensureDocumentsBucketExists } from "@xquery/db";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { streamSSE } from "hono/streaming";

// Ensure storage bucket exists on startup
ensureDocumentsBucketExists().catch(console.error);

const app = new Hono();

app.use(logger());
app.use(
  "/*",
  cors({
    origin: process.env.CORS_ORIGIN || "",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext: (_opts, context) => createContext({ context }),
  })
);

app.get("/", (c) => c.text("OK"));

app.post("/api/chat/stream", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const body = await c.req.json<{ chatId: string; question: string }>();
  if (!(body.chatId && body.question)) {
    return c.json({ error: "Missing chatId or question" }, 400);
  }

  return streamSSE(c, async (stream) => {
    try {
      for await (const event of streamQuestion({
        userId: session.user.id,
        chatId: body.chatId,
        question: body.question,
      })) {
        await stream.writeSSE({
          event: event.type,
          data: JSON.stringify(event.data),
        });
      }
    } catch (error) {
      await stream.writeSSE({
        event: "error",
        data: JSON.stringify({
          message: error instanceof Error ? error.message : "Unknown error",
        }),
      });
    }
  });
});

export default app;
