/**
 * Global teardown: clean up test database and close connections.
 */
import mongoose from 'mongoose';
import { server } from './globalSetup.js';

async function globalTeardown() {
  server?.close();
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.db?.dropDatabase();
    await mongoose.disconnect();
  }
}

export default globalTeardown;
