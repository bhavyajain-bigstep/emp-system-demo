import mongoose from "mongoose";

let cachedSupport: boolean | null = null;

/**
 * Detects whether the connected MongoDB deployment supports
 * multi-document transactions (replica set or mongos).
 *
 * Standalone `mongod` instances (e.g. a Homebrew install without
 * replication enabled) do not support transactions.
 */
async function supportsTransactions(): Promise<boolean> {
  if (cachedSupport !== null) {
    return cachedSupport;
  }

  try {
    const hello = await mongoose.connection.db!.admin().command({
      hello: 1,
    } as any);

    cachedSupport = Boolean(hello.setName) || hello.msg === "isdbgrid";
  } catch {
    cachedSupport = false;
  }

  return cachedSupport;
}

/**
 * Runs the provided callback inside a MongoDB transaction when the
 * deployment supports it.
 *
 * On deployments that do not support transactions (standalone dev
 * databases), the callback runs without a session so the workflow still
 * works — without atomicity guarantees.
 */
export async function runInTransaction<T>(
  fn: (session: mongoose.ClientSession | undefined) => Promise<T>
): Promise<T> {
  if (!(await supportsTransactions())) {
    return fn(undefined);
  }

  const session = await mongoose.startSession();

  try {
    let result!: T;

    await session.withTransaction(async () => {
      result = await fn(session);
    });

    return result;
  } finally {
    await session.endSession();
  }
}