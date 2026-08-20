import { connectTestDb, disconnectTestDb, clearTestDb } from "../integration/setup";

export const setupTestDb = () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterEach(async () => {
    await clearTestDb();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });
};
