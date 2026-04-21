import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  resolve: {
    // file:.. copies the library tree into node_modules, including its dev
    // React. Force a single instance so hooks resolve against the same copy.
    dedupe: ['react', 'react-dom', '@chenglou/pretext'],
  },
});
