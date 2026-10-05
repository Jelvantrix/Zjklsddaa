import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { app } from './src/serverApp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV !== 'development';
const port = Number(process.env.PORT) || 3000;

async function startServer() {
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distIndex = path.resolve(__dirname, 'dist', 'index.html');
    const hasBuild = existsSync(distIndex);

    if (!hasBuild) {
      console.warn(
        '[startup] dist/index.html is missing — run `npm run build` before `npm start`.'
      );
    }

    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      if (!hasBuild) {
        return res
          .status(503)
          .type('text/plain')
          .send('Front-end build missing. Run `npm run build` first.');
      }
      return res.sendFile(distIndex);
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on port ${port} (${isProd ? 'production' : 'development'})`);
  });
}

startServer();
