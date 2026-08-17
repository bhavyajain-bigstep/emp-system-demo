import mongoose from "mongoose";
import { env } from "./env";

// Mongoose buffers commands by default before a connection exists;
// keeping this true (the default) is fine as long as connectDB()
// runs before the server starts accepting requests.
mongoose.set("strictQuery", true);

let isConnected = false;

export async function connectDB(): Promise<void> {
  if (isConnected) {
    console.log("MongoDB is already connected.");
    return;
  }

  try {
    const conn = await mongoose.connect(env.MONGO_URI, {
      // Modern Mongoose (6+/7+/8+) no longer needs
      // useNewUrlParser / useUnifiedTopology — they're defaults now.
      autoIndex: env.NODE_ENV !== "production", // build indexes automatically only outside prod
      serverSelectionTimeoutMS: 10000,
    });

    isConnected = true;

    console.log(
      `MongoDB connected: ${conn.connection.host}/${conn.connection.name} (${env.NODE_ENV})`
    );
  } catch (error) {
    console.error("MongoDB connection error:", error);
    // Fail fast — an app with no DB connection shouldn't limp along.
    process.exit(1);
  }

  mongoose.connection.on("disconnected", () => {
    isConnected = false;
    console.warn("MongoDB disconnected.");
  });

  mongoose.connection.on("error", (err) => {
    console.error("MongoDB runtime error:", err);
  });
}

export async function disconnectDB(): Promise<void> {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
  console.log("MongoDB disconnected gracefully.");
}

// Handle process termination signals so connections close cleanly,
// e.g. during nodemon restarts or container shutdowns.
process.on("SIGINT", async () => {
  await disconnectDB();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await disconnectDB();
  process.exit(0);
});