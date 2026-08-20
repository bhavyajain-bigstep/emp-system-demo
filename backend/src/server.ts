import "dotenv/config";
import app from "./app";
import { connectDB } from "./config/db";
import { env } from "./config/env";

const PORT = env.PORT;

async function startServer() {
  // Connect to MongoDB first — don't accept traffic until the DB is up
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});