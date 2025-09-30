// prisma.config.ts
import path from "node:path";
import "dotenv/config";
import { defineConfig } from "prisma/config"; // Or import type { PrismaConfig } from "prisma";

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"), // Path to your schema.prisma file
  migrations: {
    path: path.join("db", "prisma", "migrations"), // Path to your migration files
  },
  views: {
    path: path.join("db", "views"), // Path to your view files
  },
  typedSql: {
    path: path.join("db", "queries"), // Path to your typed SQL query files
  },
});
