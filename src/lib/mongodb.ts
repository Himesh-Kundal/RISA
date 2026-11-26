import { MongoClient, Db } from "mongodb";
import { WorkspaceState } from "@/types/sponsor";
import { createInitialWorkspaceState } from "@/data/live2026Seed";

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
  // eslint-disable-next-line no-var
  var _fallbackWorkspace: WorkspaceState | undefined;
}

const WORKSPACE_KEY = "campusfest_2026_main";

async function getDb(): Promise<Db | null> {
  const uri = process.env.MONGODB_URI;
  if (!uri) return null;

  try {
    if (!global._mongoClientPromise) {
      const client = new MongoClient(uri, {
        serverSelectionTimeoutMS: 6000,
        connectTimeoutMS: 6000,
      });
      global._mongoClientPromise = client.connect();
    }
    const client = await global._mongoClientPromise;
    return client.db("risa_sponsor_boss");
  } catch (err) {
    console.error("MongoDB connection fallback activated:", err);
    global._mongoClientPromise = undefined;
    return null;
  }
}

export async function getWorkspaceState(): Promise<{
  state: WorkspaceState;
  storageMode: "mongodb_atlas" | "memory_fallback";
}> {
  const db = await getDb();
  if (db) {
    const col = db.collection<WorkspaceState>("workspaces");
    const doc = await col.findOne(
      { workspaceKey: WORKSPACE_KEY },
      { projection: { _id: 0 } }
    );
    if (!doc) {
      const seed = createInitialWorkspaceState();
      await col.updateOne(
        { workspaceKey: WORKSPACE_KEY },
        { $set: seed },
        { upsert: true }
      );
      return { state: seed, storageMode: "mongodb_atlas" };
    }
    return { state: doc as WorkspaceState, storageMode: "mongodb_atlas" };
  }

  if (!global._fallbackWorkspace) {
    global._fallbackWorkspace = createInitialWorkspaceState();
  }
  return { state: global._fallbackWorkspace, storageMode: "memory_fallback" };
}

export async function saveWorkspaceState(
  nextState: WorkspaceState
): Promise<{
  state: WorkspaceState;
  storageMode: "mongodb_atlas" | "memory_fallback";
}> {
  const updated: WorkspaceState = {
    ...nextState,
    workspaceKey: WORKSPACE_KEY,
    updatedAt: new Date().toISOString(),
  };
  const db = await getDb();
  if (db) {
    const col = db.collection<WorkspaceState>("workspaces");
    await col.updateOne(
      { workspaceKey: WORKSPACE_KEY },
      { $set: updated },
      { upsert: true }
    );
    return { state: updated, storageMode: "mongodb_atlas" };
  }

  global._fallbackWorkspace = updated;
  return { state: updated, storageMode: "memory_fallback" };
}

export async function resetWorkspaceState(): Promise<{
  state: WorkspaceState;
  storageMode: "mongodb_atlas" | "memory_fallback";
}> {
  const fresh = createInitialWorkspaceState();
  return saveWorkspaceState(fresh);
}
