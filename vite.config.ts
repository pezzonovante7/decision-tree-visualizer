import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const repo = "decision-tree-visualizer";

export default defineConfig({
  plugins: [react()],
  // Project Pages serves the site at /<repo>/. Local dev stays at /.
  base: process.env.GITHUB_PAGES === "true" ? `/${repo}/` : "/",
});
