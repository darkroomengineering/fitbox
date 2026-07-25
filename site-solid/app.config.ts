import { defineConfig } from "@solidjs/start/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
    ssr: {
      // Prevents the server environment from attempting to evaluate three.js
      noExternal: ["solid-three", "three"],
    },
  },
});
