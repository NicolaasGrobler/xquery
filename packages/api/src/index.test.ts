import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";
import { protectedProcedure, publicProcedure, router, t } from "./index";

describe("tRPC setup", () => {
  describe("router", () => {
    it("creates a router from procedures", () => {
      const testRouter = router({
        hello: publicProcedure.query(() => "Hello, World!"),
      });

      expect(testRouter).toBeDefined();
      expect(testRouter._def.procedures.hello).toBeDefined();
    });
  });

  describe("publicProcedure", () => {
    it("allows access without session", async () => {
      const testRouter = router({
        public: publicProcedure.query(() => "public data"),
      });

      const caller = t.createCallerFactory(testRouter)({ session: null });
      const result = await caller.public();

      expect(result).toBe("public data");
    });
  });

  describe("protectedProcedure", () => {
    it("throws UNAUTHORIZED when no session is provided", async () => {
      const testRouter = router({
        protected: protectedProcedure.query(() => "protected data"),
      });

      const caller = t.createCallerFactory(testRouter)({ session: null });

      await expect(caller.protected()).rejects.toThrow(TRPCError);
      await expect(caller.protected()).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    });

    it("allows access with valid session", async () => {
      const testRouter = router({
        protected: protectedProcedure.query(() => "protected data"),
      });

      const mockSession = {
        user: { id: "user-123", email: "test@example.com" },
        session: { id: "session-123" },
      };

      const caller = t.createCallerFactory(testRouter)({
        session: mockSession,
      });
      const result = await caller.protected();

      expect(result).toBe("protected data");
    });

    it("passes session to context after middleware", async () => {
      const testRouter = router({
        getUser: protectedProcedure.query(({ ctx }) => ctx.session.user.id),
      });

      const mockSession = {
        user: { id: "user-456", email: "test@example.com" },
        session: { id: "session-456" },
      };

      const caller = t.createCallerFactory(testRouter)({
        session: mockSession,
      });
      const result = await caller.getUser();

      expect(result).toBe("user-456");
    });
  });
});
