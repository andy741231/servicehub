import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import routes from './routes/index.js';

const app = express();
const port = process.env.PORT || 4000;

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// Simple CSRF token generation endpoint
app.get('/api/csrf-token', (req, res) => {
  // In a real app with more strict CSRF, we'd use csurf package or double submit cookies
  // For this blueprint phase, we'll return a static/dummy token or a simple generated one
  const csrfToken = Math.random().toString(36).substring(2);
  res.cookie('XSRF-TOKEN', csrfToken, { sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
  res.json({ csrfToken });
});

app.use('/api', routes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
