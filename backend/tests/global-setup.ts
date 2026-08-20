import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";
import fs from "fs";
import os from "os";
import path from "path";

const CONFIG_PATH = path.join(os.tmpdir(), "elms-test-mongo-uri.json");

export default async function globalSetup(): Promise<void> {
  const mongod = await MongoMemoryReplSet.create({
    replSet: {
      count: 1,
      storageEngine: "wiredTiger",
    },
  });

  await mongod.waitUntilRunning();

  const uri = `${mongod.getUri()}&directConnection=true`;

  // Force the primary to be elected and accept writes before tests connect.
  // A fresh single-node replica set can otherwise stall the first write.
  await mongoose.connect(uri);
  await mongoose.connection.db!.collection("__warmup").insertOne({ ok: true });
  await mongoose.connection.db!.collection("__warmup").drop();
  await mongoose.disconnect();

  fs.writeFileSync(
    CONFIG_PATH,
    JSON.stringify({ uri, pid: process.pid })
  );

  (globalThis as any).__MONGOD__ = mongod;
}

export async function globalTeardown(): Promise<void> {
  const mongod = (globalThis as any).__MONGOD__;

  if (mongod) {
    await mongod.stop();
  }

  try {
    fs.unlinkSync(CONFIG_PATH);
  } catch {
    // Ignore if the file was already removed.
  }
}