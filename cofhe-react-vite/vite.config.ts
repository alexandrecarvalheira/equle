import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import wasm from "vite-plugin-wasm";
import tsconfigPaths from 'vite-tsconfig-paths'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import topLevelAwait from 'vite-plugin-top-level-await';
// @ts-expect-error - Tailwind CSS v4 types may not be fully available yet
import tailwindcss from '@tailwindcss/vite'


// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),
    wasm(),
    tsconfigPaths(),
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/.pnpm/tfhe@*/node_modules/tfhe/tfhe_bg.wasm',
          dest: ''
        }
      ]
    }),
    topLevelAwait(),
    tailwindcss(),

  ],
  build: { target: 'esnext' },
  optimizeDeps: { 
    esbuildOptions: { target: 'esnext' },
    exclude: ['cofhejs', 'tfhe'],
  },
  assetsInclude: ['**/*.wasm'],
  resolve: {
    alias: {
      'tweetnacl': 'tweetnacl/nacl-fast.js'
    }
  }
})
