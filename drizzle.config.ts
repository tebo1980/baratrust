import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  driver: "pg",
  dbCredentials: {
    connectionString:
      process.env.DATABASE_URL ||
      process.env.POSTGRES_DATABASE_URL_UNPOOLED ||
      process.env.POSTGRES_DATABASE_URL ||
      "",
  },
} satisfies Config;
