import { defineConfig } from 'vite';
import { resolve } from 'path';
import copy from 'rollup-plugin-copy';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

export default defineConfig(({ mode }) => {
  return {
    css: {
      postcss: {
        plugins: [
          tailwindcss(),
          autoprefixer(),
        ],
      },
    },
    build: {
      outDir: 'dist',
      rollupOptions: {
        input: {
          // Define your entry points for different parts of the extension
          background: resolve(__dirname, 'src/background.ts'),
          content: resolve(__dirname, 'src/content.ts'),
          popup: resolve(__dirname, 'src/popup/popup.ts'),
        },
        output: {
          entryFileNames: '[name].js', // Use names that match the manifest entries
          chunkFileNames: '[name].js', // Ensure proper naming for chunks
          assetFileNames: '[name].[ext]', // Keep asset file names intact
        }
      }
    },
    plugins: [
      // Copy static assets like manifest.json and icons to the dist folder
      copy({
        targets: [
          { src: 'icons', dest: 'dist' }, // Adjust if your manifest.json or icons are in another folder
          { src: 'manifest.json', dest: 'dist' },
          { src: ['src/popup/**/*', '!**/*.ts', '!**/*.css'], dest: 'dist/popup' },
        ],
        hook: 'writeBundle' // Ensure this runs during the build phase
      })
    ],
    define: {
      __ENV__: JSON.stringify(mode), // Pass environment variables if needed
    }
  };
});