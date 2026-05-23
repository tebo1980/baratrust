import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema.ts", // Make sure this path matches your setup!
  out: "./drizzle",
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  }
};