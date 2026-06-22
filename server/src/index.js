import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import routes from './routes/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 4000;
const isProd = process.env.NODE_ENV === 'production';

// In production the client is built and served by this server
// In dev, Vite runs separately on port 3000
if (!isProd) {
  app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true
  }));
}

app.use(express.json());
app.use(cookieParser());

// Simple CSRF token generation endpoint
app.get('/api/csrf-token', (req, res) => {
  // In a real app with more strict CSRF, we'd use csurf package or double submit cookies
  // For this blueprint phase, we'll return a static/dummy token or a simple generated one
  const csrfToken = Math.random().toString(36).substring(2);
  res.cookie('XSRF-TOKEN', csrfToken, { sameSite: 'lax', secure: isProd });
  res.json({ csrfToken });
});

app.use('/api', routes);

// Serve built React frontend in production
// Deploy layout: src/ and client/dist/ are siblings under the deploy root
if (isProd) {
  const clientDist = join(__dirname, '../client/dist');
  if (existsSync(clientDist)) {
    app.use(express.static(clientDist));
    // SPA fallback — all non-API routes return index.html
    app.get('*', (req, res) => {
      res.sendFile(join(clientDist, 'index.html'));
    });
  }
}

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(port, () => {
  console.log(`Server listening on port ${port} [${isProd ? 'production' : 'development'}]`);
});
