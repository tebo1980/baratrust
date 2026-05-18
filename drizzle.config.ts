import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema.ts", // Make sure this path matches your setup!
  out: "./drizzle",
  driver: "pg", // <-- This is the exact string Drizzle is demanding
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!, // Or whatever your env variable is named
  }
} satisfies Config;