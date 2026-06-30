import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import routes from './routes/index.js';
import prisma from './db/client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 4000;
const isProd = process.env.NODE_ENV === 'production';

// In production the client is built and served by this server
// In dev, Vite runs separately on port 3000
if (!isProd) {
  app.use(cors({
    origin: function(origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      // Allow any localhost origin for development
      if (origin.startsWith('http://localhost:')) return callback(null, true);
      callback(null, true);
    },
    credentials: true
  }));
}

app.use(express.json());
app.use(cookieParser());

// Serve uploaded assets (images, docs, etc.) from the project-root /uploads folder
app.use('/uploads', express.static(join(__dirname, '../../uploads')));

// Simple CSRF token generation endpoint
app.get('/api/csrf-token', (req, res) => {
  // In a real app with more strict CSRF, we'd use csurf package or double submit cookies
  // For this blueprint phase, we'll return a static/dummy token or a simple generated one
  const csrfToken = Math.random().toString(36).substring(2);
  res.cookie('XSRF-TOKEN', csrfToken, { sameSite: 'lax', secure: isProd });
  res.json({ csrfToken });
});

// Health check endpoint — used by CI smoke tests and Azure monitoring
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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

// Warm up the Prisma connection before accepting requests so the first
// public page load doesn't hit a cold database connection and return 500.
await prisma.$connect();

app.listen(port, () => {
  console.log(`Server listening on port ${port} [${isProd ? 'production' : 'development'}]`);
});
