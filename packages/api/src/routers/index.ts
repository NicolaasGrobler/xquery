import { protectedProcedure, publicProcedure, router } from "../index";
import { filesRouter } from "./files";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => "OK"),
  privateData: protectedProcedure.query(({ ctx }) => ({
    message: "This is private",
    user: ctx.session.user,
  })),
  files: filesRouter,
});
export type AppRouter = typeof appRouter;
