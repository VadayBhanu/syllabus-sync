import { MongoClient, type Db } from "mongodb";

// One client per server instance (and per hot reload in dev).
const g = globalThis as unknown as { _mongo?: Promise<MongoClient> };

export async function db(): Promise<Db> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI not set");
  if (!g._mongo) {
    g._mongo = new MongoClient(uri, { serverSelectionTimeoutMS: 8000, appName: "syllabus-sync" }).connect();
    g._mongo.catch(() => (g._mongo = undefined));
  }
  const client = await g._mongo;
  const d = client.db(process.env.MONGODB_DB || "syllabus_sync");
  await ensureIndexes(d);
  return d;
}

let indexed = false;
async function ensureIndexes(d: Db) {
  if (indexed) return;
  indexed = true;
  await Promise.all([
    d.collection("courses").createIndex({ voyage: 1 }),
    d.collection("deadlines").createIndex({ voyage: 1, date: 1 }),
    d.collection("sessions").createIndex({ voyage: 1, date: 1 }),
  ]).catch(() => (indexed = false));
}
