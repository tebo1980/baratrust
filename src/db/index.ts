import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

// Provide a dummy URL during Vercel build to prevent static rendering crashes
const dbUrl =
  process.env.NEXT_PHASE === "phase-production-build" ||
  process.env.npm_lifecycle_event === "build"
    ? process.env.DATABASE_URL || "postgres://dummy:dummy@localhost:5432/dummy"
    : process.env.DATABASE_URL;

if (!dbUrl) {
  throw new Error('DATABASE_URL must be set in your .env.local');
}

const sql = neon(dbUrl);
export const db = drizzle(sql);