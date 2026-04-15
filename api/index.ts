import type { IncomingMessage, ServerResponse } from 'http';
import mongoose from 'mongoose';
import { createApp } from '../server/index.js';

const MONGODB_URI = process.env.MONGODB_URI;

async function ensureDbConnected() {
  if (mongoose.connection.readyState >= 1) return;
  if (!MONGODB_URI) throw new Error('Missing MONGODB_URI in environment.');
  await mongoose.connect(MONGODB_URI);
}

const app = createApp();

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  await ensureDbConnected();
  app(req, res);
}
