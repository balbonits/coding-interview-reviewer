import { MongoClient, type Db } from "mongodb";

const MONGODB_URI =
  process.env.MONGODB_URI ?? "mongodb://localhost:27017";
const DB_NAME =
  process.env.MONGODB_DB ?? "coding-interview-reviewer";

// Next.js dev hot-reload creates new module instances; cache on global to
// avoid opening a new connection on every reload.
declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function createClientPromise(): Promise<MongoClient> {
  const client = new MongoClient(MONGODB_URI);
  return client.connect();
}

const clientPromise: Promise<MongoClient> =
  process.env.NODE_ENV === "development"
    ? (global._mongoClientPromise ??= createClientPromise())
    : createClientPromise();

export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db(DB_NAME);
}
