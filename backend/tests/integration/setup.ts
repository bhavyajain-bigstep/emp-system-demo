import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";

let replSet: MongoMemoryReplSet | undefined;

export const connectTestDb = async (): Promise<string> => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection.host ?? "";
  }

  replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });

  const uri = replSet.getUri();

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 30000,
  });

  return uri;
};

export const disconnectTestDb = async (): Promise<void> => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  } finally {
    if (replSet) {
      await replSet.stop();
      replSet = undefined;
    }
  }
};

export const clearTestDb = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 1) return;

  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
};
