import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';

// On Replit, the platform injects PORT as this artifact's own assigned
// port (each artifact gets a distinct one), so it's safe to use there.
// Locally, the root .env's PORT is the backend/API server's port
// (e.g. 8080) and must never be reused for the frontend, or Vite would
// bind to the same port as Express. Local dev should use FRONTEND_PORT
// instead, defaulting to 5173 if not set.
const isReplit = process.env.REPL_ID !== undefined;

// When running outside Replit there is no path-based proxy handling /api/*,
// so the Vite dev server must forward those requests to the Express backend.
// API_PORT (or PORT when set and not Replit) tells us where Express is listening.
const apiPort = !isReplit
  ? (process.env.API_PORT ?? process.env.PORT ?? '8080')
  : null;

// Detect if we're in a pure build (no dev server needed).
// During `vite build`, PORT is irrelevant — only dev/preview need it.
const isBuildMode = process.argv.includes('build');

let rawPort: string;
if (isReplit) {
  rawPort = process.env.PORT ?? '';
  if (!rawPort && !isBuildMode) {
    throw new Error('PORT environment variable is required but was not provided.');
  }
  rawPort = rawPort || '5173'; // safe fallback for build mode only
} else {
  rawPort = process.env.FRONTEND_PORT ?? '5173';
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(
    isReplit
      ? `Invalid PORT value: "${rawPort}"`
      : `Invalid FRONTEND_PORT value: "${rawPort}"`,
  );
}

// In production (Replit deployments/previews), BASE_PATH is always injected
// to route this artifact under its assigned path prefix. For local
// development (e.g. running directly on Windows/macOS/Linux outside of
// Replit) there is no path-based proxy, so default to "/" instead of
// requiring it to be set manually.
const basePath = process.env.BASE_PATH || '/';

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== 'production' &&
    process.env.REPL_ID !== undefined
      ? [
          await import('@replit/vite-plugin-cartographer').then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, '..'),
            }),
          ),
          await import('@replit/vite-plugin-dev-banner').then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@assets': path.resolve(
        import.meta.dirname,
        '..',
        '..',
        'attached_assets',
      ),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    fs: {
      strict: true,
    },
    // Local dev only: Replit's path-based proxy handles /api/* routing in
    // production/preview. Locally there is no such proxy, so we forward
    // /api/* to the Express backend ourselves.
    ...(apiPort
      ? {
          proxy: {
            '/api': {
              target: `http://localhost:${apiPort}`,
              changeOrigin: true,
              secure: false,
            },
          },
        }
      : {}),
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
