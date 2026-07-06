import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  root: resolve(process.cwd(), "src"),
  build: {
    outDir: resolve(process.cwd(), "dist"),
    emptyOutDir: true,
  },
  server: { port: 5173 },
});
