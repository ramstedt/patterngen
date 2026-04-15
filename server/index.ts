import express from 'express';
import mongoose from 'mongoose';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import measurementProfileRoutes from './routes/measurementProfiles.js';

export function createApp() {
  const app = express();

  app.use(express.json());

  // Trust proxy so req.ip resolves correctly behind reverse proxies
  app.set('trust proxy', 1);

  // ── Routes ───────────────────────────────────
  app.use('/api/auth', authRoutes);
  app.use('/api/me', userRoutes);
  app.use('/api/measurement-profiles', measurementProfileRoutes);

  return app;
}

// ── Start (only when run directly) ───────────
const isDirectRun =
  typeof process.argv[1] === 'string' &&
  process.argv[1].replace(/\.ts$/, '').endsWith('server/index');

if (isDirectRun) {
  const PORT = process.env.PORT || 3001;
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    console.error('Missing MONGODB_URI in environment.');
    process.exit(1);
  }

  mongoose
    .connect(MONGODB_URI)
    .then(() => {
      console.log('Connected to MongoDB via Mongoose.');
      const app = createApp();
      app.listen(PORT, () => {
        console.log(`Server listening on http://localhost:${PORT}`);
      });
    })
    .catch((err) => {
      console.error('MongoDB connection error:', err);
      process.exit(1);
    });
}
