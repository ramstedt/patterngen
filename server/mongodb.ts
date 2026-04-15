import { MongoClient, ServerApiVersion, type Db } from 'mongodb';

const DEFAULT_DB_NAME = 'sewmetry';

let cachedClient: MongoClient | null = null;
let cachedClientPromise: Promise<MongoClient> | null = null;

function normalizePasswordSegment(password: string) {
  try {
    return encodeURIComponent(decodeURIComponent(password));
  } catch {
    return encodeURIComponent(password);
  }
}

function normalizeMongoUri(uri: string) {
  const schemeMatch = uri.match(/^mongodb(?:\+srv)?:\/\//);

  if (!schemeMatch) {
    return uri;
  }

  const scheme = schemeMatch[0];
  const rest = uri.slice(scheme.length);
  const authorityEnd = rest.search(/[/?]/);
  const authority = authorityEnd >= 0 ? rest.slice(0, authorityEnd) : rest;
  const suffix = authorityEnd >= 0 ? rest.slice(authorityEnd) : '';
  const authSeparator = authority.lastIndexOf('@');

  if (authSeparator < 0) {
    return uri;
  }

  const auth = authority.slice(0, authSeparator);
  const host = authority.slice(authSeparator + 1);
  const passwordSeparator = auth.indexOf(':');

  if (passwordSeparator < 0) {
    return uri;
  }

  const username = auth.slice(0, passwordSeparator);
  const password = auth.slice(passwordSeparator + 1);
  const normalizedPassword = normalizePasswordSegment(password);

  if (normalizedPassword === password) {
    return uri;
  }

  return `${scheme}${username}:${normalizedPassword}@${host}${suffix}`;
}

function getMongoUri() {
  const uri = process.env.MONGODB_URI?.trim();

  if (!uri) {
    throw new Error('Missing MONGODB_URI in the environment.');
  }

  return normalizeMongoUri(uri);
}

export function createMongoClient() {
  return new MongoClient(getMongoUri(), {
    serverApi: {
      version: ServerApiVersion.v1,
    },
  });
}

export async function getMongoClient() {
  if (cachedClient) {
    return cachedClient;
  }

  if (!cachedClientPromise) {
    cachedClientPromise = createMongoClient()
      .connect()
      .then((client) => {
        cachedClient = client;
        return client;
      })
      .catch((error) => {
        cachedClientPromise = null;
        throw error;
      });
  }

  return cachedClientPromise;
}

export async function getDatabase(name = process.env.MONGODB_DB_NAME || DEFAULT_DB_NAME): Promise<Db> {
  const client = await getMongoClient();
  return client.db(name);
}
