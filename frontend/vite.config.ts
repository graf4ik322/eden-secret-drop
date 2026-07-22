import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import tailwindcss from '@tailwindcss/vite';
import { execSync } from 'child_process';

const buildSha = execSync('git rev-parse --short HEAD 2>/dev/null || echo "unknown"').toString().trim();
const buildTime = Date.now();

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    __BUILD_SHA__: JSON.stringify(buildSha),
    __BUILD_TIME__: JSON.stringify(buildTime),
  },
  plugins: [
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],
  build: {
    target: 'esnext',
    minify: 'terser'
  },
  publicDir: './public',
  server: {
    host: true,
    proxy: {
      '/api/upload': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
