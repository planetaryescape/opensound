import adapter from "@sveltejs/adapter-node";
import { sveltekit } from "@sveltejs/kit/vite";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    sveltekit({
      adapter: adapter(),
      preprocess: vitePreprocess(),
      alias: { $lib: "./src/lib" },
    }),
  ],
  server: {
    port: 5174,
  },
  ssr: {
    external: ["@spotify-effect/otel-node"],
  },
});
