import { defineConfig } from "prisma/config";

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL || "postgresql://gallery:gallery@localhost:5432/gallery",
  },
});
