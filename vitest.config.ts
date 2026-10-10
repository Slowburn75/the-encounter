import path from "node:path";
import { config } from "dotenv";
import { defineConfig } from "vitest/config";

config({ path: ".env.local" });
config({ path: ".env" });

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
