import mongoose from "mongoose";

let cachedSupport: boolean | null = null;

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

export async function runInTransaction<T>(
  fn: (session: mongoose.ClientSession | undefined) => Promise<T>,
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
