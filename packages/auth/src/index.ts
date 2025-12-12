import { db } from "@xquery/db";
import * as schema from "@xquery/db/schema/auth";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";

const VALID_INVITATION_CODE = "xenet.ai";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",

    schema,
  }),
  trustedOrigins: [process.env.CORS_ORIGIN || ""],
  emailAndPassword: {
    enabled: true,
  },
  advanced: {
    defaultCookieAttributes: {
      sameSite: "none",
      secure: true,
      httpOnly: true,
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: (user, ctx) => {
          const invitationCode = ctx?.body?.invitationCode as
            | string
            | undefined;
          if (invitationCode !== VALID_INVITATION_CODE) {
            throw new APIError("FORBIDDEN", {
              message: "Invalid invitation code",
            });
          }
          return Promise.resolve({ data: user });
        },
      },
    },
  },
});
