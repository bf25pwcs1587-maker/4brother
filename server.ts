import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { initDatabase } from './server/db.ts';
import { apiRouter } from './server/routes.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  // Initialize SQLite database and tables
  initDatabase();

  const app = express();
  const isProduction = process.env.NODE_ENV === 'production';
  const PORT = isProduction
    ? parseInt(process.env.PORT || '8080', 10)
    : parseInt(process.env.DEFAULT_APP_PORT || '3000', 10);

  // Parse JSON payloads
  app.use(express.json());

  // Mount API Router
  app.use('/api', apiRouter);

  // Serve static assets or mount Vite dev middleware
  if (!isProduction) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[4broters] Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[4broters] Fatal startup error:', err);
  process.exit(1);
});
