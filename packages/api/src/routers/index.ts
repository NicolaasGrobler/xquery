import { protectedProcedure, publicProcedure, router } from "../index";
import { chatRouter } from "./chat";
import { filesRouter } from "./files";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => "OK"),
  privateData: protectedProcedure.query(({ ctx }) => ({
    message: "This is private",
    user: ctx.session.user,
  })),
  files: filesRouter,
  chat: chatRouter,
});
export type AppRouter = typeof appRouter;
