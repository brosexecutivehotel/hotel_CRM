// Quick connectivity check: lists public tables in the provisioned database.
// Usage: npx dotenv -e .env.local -- node scripts/verify-db.mjs
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

const rows = await sql`
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public'
  ORDER BY table_name
`;

console.log(`Connected. Tables (${rows.length}):`);
for (const row of rows) console.log(`  - ${row.table_name}`);
process.exit(0);
