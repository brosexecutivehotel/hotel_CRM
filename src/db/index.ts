import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Lazy initialization: `neon()` throws when DATABASE_URL is missing, and
// Next.js evaluates top-level module code at build time. Never call neon()
// at module scope or wrap this in a Proxy (breaks adapter introspection).
function createDb() {
  const sql = neon(process.env.DATABASE_URL!);
  return drizzle(sql, { schema });
}

let _db: ReturnType<typeof createDb> | null = null;

export function getDb() {
  if (!_db) _db = createDb();
  return _db;
}

export type Database = ReturnType<typeof createDb>;
export { schema };
