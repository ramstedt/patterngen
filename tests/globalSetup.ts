/**
 * Global setup: start one Express server + Mongoose connection shared by all spec files.
 */
import type { FullConfig } from '@playwright/test';
import mongoose from 'mongoose';
import { createApp } from '../server/index.js';
import type { Server } from 'node:http';

const TEST_DB = 'sewmetry_test';

let server: Server;

async function globalSetup(_config: FullConfig) {
  process.env.NODE_ENV = 'test';
  const MONGO_URI = process.env.MONGODB_URI!;
  await mongoose.connect(MONGO_URI, { dbName: TEST_DB });
  await mongoose.connection.db!.dropDatabase();

  const app = createApp();
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 3001;
      // Expose to tests via env var
      process.env.TEST_BASE_URL = `http://localhost:${port}`;
      resolve();
    });
  });
}

export default globalSetup;

export { server };
