import { drizzle } from "drizzle-orm/node-postgres";

export const db = drizzle(process.env.DATABASE_URL || "");

export { and, asc, count, desc, eq, ilike, or } from "drizzle-orm";
export * from "./schema/auth";
export * from "./schema/chat";
export * from "./schema/files";
export * from "./supabase";
