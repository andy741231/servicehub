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

// Prisma readiness flag — flipped true once $connect() succeeds. The health
// endpoint reports 503 until then so probes/proxy don't route traffic to a
// server whose DB pool isn't ready yet (cold-start protection).
let prismaReady = false;
export const isPrismaReady = () => prismaReady;

// Health check endpoint — used by CI smoke tests and Azure monitoring.
// Returns 503 with a "warming_up" status until Prisma has connected, so the
// Vite dev proxy and Azure warm-up probe don't forward requests to a server
// whose DB pool is still being established.
app.get('/api/health', (req, res) => {
  if (prismaReady) {
    return res.json({ status: 'ok', timestamp: new Date().toISOString() });
  }
  res.status(503).json({ status: 'warming_up', timestamp: new Date().toISOString() });
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

// Bind the HTTP server FIRST so the port is reserved immediately and the
// Vite dev proxy never hits ECONNREFUSED during a cold DB start. Prisma is
// warmed up in the background with retry — see warmUpPrisma() below.
app.listen(port, () => {
  console.log(`Server listening on port ${port} [${isProd ? 'production' : 'development'}]`);
});

// Warm up the Prisma connection pool in the background with exponential
// backoff. This must NOT block app.listen() (otherwise a slow remote Azure
// SQL handshake exceeds the default 10s pool timeout and crashes the process
// before the server ever binds — see P2024 cold-start crashes). Likewise it
// must NOT crash the process on failure: routes that touch the DB will
// surface their own errors, and /api/health stays 503 until this resolves.
const warmUpPrisma = async (attempt = 1) => {
  try {
    await prisma.$connect();
    prismaReady = true;
    console.log('Prisma connected');
  } catch (err) {
    console.error(`Prisma connect attempt ${attempt} failed: ${err.message}`);
    if (attempt < 10) {
      setTimeout(() => warmUpPrisma(attempt + 1), Math.min(3000 * attempt, 15000));
    } else {
      console.error('Prisma gave up warming up after 10 attempts. Server is up but DB routes will fail until the DB is reachable and the process is restarted.');
    }
  }
};
warmUpPrisma();
