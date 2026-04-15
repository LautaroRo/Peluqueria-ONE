import mongoose from "mongoose";

const MONGO_DB = process.env.MONGO_DB_URL!;

export async function connectDB() {
  if (mongoose.connection.readyState === 1) return;

  await mongoose.connect(MONGO_DB);
}

