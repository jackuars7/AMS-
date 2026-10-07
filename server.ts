import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { apiRouter } from './src/server/routes.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Mount API routes first
  app.use('/api/v1', apiRouter);

  // Top-level aliases for health and docs
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/api/docs/openapi.json', (req, res) => {
    res.redirect('/api/v1/docs/openapi.json');
  });

  // Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Enterprise AML/KYC Adverse Media Screening Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
