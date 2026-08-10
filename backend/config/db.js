import mongoose from "mongoose";

// ─────────────────────────────────────────────────────────────────────────────
// NEXORA AI — MongoDB Connection (Local Compass · port 27017)
// NOTE: The project uses ES Modules ("type":"module" in package.json).
//       The logic below is identical to the requested CommonJS snippet —
//       only the import/export syntax differs to stay compatible.
// ─────────────────────────────────────────────────────────────────────────────

const connectDB = async () => {
  try {
    // Replace 'nexora_db' with your preferred local database name inside Compass
    const localURI =
      process.env.MONGO_URI || "mongodb://127.0.0.1:27017/nexora_db";

    await mongoose.connect(localURI);

    console.log(
      "📡 Connected successfully to Local MongoDB via Compass on port 27017"
    );
  } catch (err) {
    console.error("❌ Database connection failure:", err.message);
    process.exit(1);
  }
};

// Graceful teardown on SIGINT (Ctrl+C)
process.on("SIGINT", async () => {
  await mongoose.connection.close();
  console.log("\x1b[33m[NEXORA]\x1b[0m 🔌 MongoDB connection closed on SIGINT.");
  process.exit(0);
});

export default connectDB;
