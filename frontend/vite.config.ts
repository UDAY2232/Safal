import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const currentBuildTime = Date.now().toString();

function autoVersionPlugin(): Plugin {
  return {
    name: 'safal-auto-version',
    apply: 'build',
    buildStart() {
      const payload = JSON.stringify(
        {
          version: '1.0.0',
          buildTime: currentBuildTime,
          builtAt: new Date().toISOString(),
        },
        null,
        2
      );
      try {
        const publicDir = path.resolve(__dirname, 'public');
        if (!fs.existsSync(publicDir)) {
          fs.mkdirSync(publicDir, { recursive: true });
        }
        fs.writeFileSync(path.join(publicDir, 'version.json'), payload);
      } catch (e) {
        console.warn('Failed to write public/version.json', e);
      }
    },
    closeBundle() {
      const payload = JSON.stringify(
        {
          version: '1.0.0',
          buildTime: currentBuildTime,
          builtAt: new Date().toISOString(),
        },
        null,
        2
      );
      try {
        const distDir = path.resolve(__dirname, 'dist');
        if (fs.existsSync(distDir)) {
          fs.writeFileSync(path.join(distDir, 'version.json'), payload);
        }
      } catch (e) {
        console.warn('Failed to write dist/version.json', e);
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), autoVersionPlugin()],
  define: {
    __APP_BUILD_TIME__: JSON.stringify(currentBuildTime),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
