import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  root: resolve(process.cwd(), "src"),
  build: {
    outDir: resolve(process.cwd(), "dist"),
    emptyOutDir: true,
    // CodeMirror 整体约 610KB，无法再拆，属预期体积
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // CodeMirror 单独分包，避免主包体积告警
        manualChunks: (id) => (id.includes("@codemirror") || id.includes("@lezer") ? "editor" : undefined),
      },
    },
  },
  server: { port: 5173 },
});
