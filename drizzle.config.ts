import { defineConfig } from "drizzle-kit";

// drizzle-kit does not load .env.local itself — run it through dotenv-cli:
//   npm run db:push   (dotenv -e .env.local -- drizzle-kit push)
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  strict: true,
  verbose: true,
});
