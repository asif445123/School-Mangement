import mongoose from "mongoose";
const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/school-management";
const cached = (global as any).mongooseCache || ((global as any).mongooseCache = { conn: null, promise: null });
export async function connectDb() {
  if (cached.conn) return cached.conn;
  cached.promise ||= mongoose.connect(uri);
  cached.conn = await cached.promise;
  return cached.conn;
}
