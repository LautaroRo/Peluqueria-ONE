import mongoose from "mongoose";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache || { conn: null, promise: null };
global.mongooseCache = cached;

// La conexión se reutiliza entre pedidos (Vercel mantiene viva la función un rato)
export async function connectDB() {
  if (cached.conn) return cached.conn;

  // Se valida acá y no al importar: así el build no se cae si la variable no está en esa etapa
  const url = process.env.MONGO_DB_URL;
  if (!url) throw new Error("MONGO_DB_URL no está definida");

  cached.promise ??= mongoose.connect(url, { serverSelectionTimeoutMS: 8000 });

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    throw error;
  }

  return cached.conn;
}
