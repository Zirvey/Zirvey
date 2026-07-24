import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// GitHub Pages project site: BASE_PATH=/repo-name/
// User site (username.github.io): BASE_PATH=/
const base = process.env.BASE_PATH || "/";

export default defineConfig({
  plugins: [tailwindcss()],
  base,
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        resume: resolve(__dirname, "resume.html"),
      },
    },
  },
});
