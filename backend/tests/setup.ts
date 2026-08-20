import fs from "fs";
import os from "os";
import path from "path";
import mongoose from "mongoose";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret-key";

const CONFIG_PATH = path.join(os.tmpdir(), "elms-test-mongo-uri.json");

// Read the in-memory Mongo URI synchronously so it is set BEFORE any app
// module is imported (config/env.ts captures the value at import time).
const { uri } = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
process.env.MONGO_URI = uri;

beforeAll(async () => {
  await mongoose.connect(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 30000,
  });
});

beforeEach(async () => {
  const collections = mongoose.connection.collections;

  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
});