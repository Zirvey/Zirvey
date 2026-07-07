import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

// GitHub Pages project site: BASE_PATH=/repo-name/
// User site (username.github.io): BASE_PATH=/
const base = process.env.BASE_PATH || "/";

export default defineConfig({
  plugins: [tailwindcss()],
  base,
});
