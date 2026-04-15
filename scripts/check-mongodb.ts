import { getDatabase, getMongoClient } from '../server/mongodb.ts';

async function main() {
  const database = await getDatabase();

  await database.command({ ping: 1 });

  const client = await getMongoClient();
  const { hosts } = client.options;
  const dbName = database.databaseName;

  console.log(`MongoDB connection OK. Database: ${dbName}. Hosts: ${hosts.join(', ')}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`MongoDB connection failed: ${message}`);
  process.exitCode = 1;
});
