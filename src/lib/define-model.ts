import mongoose, { Model, Schema } from "mongoose";
// Re-registers the model on every load so schema changes apply without a stale cached model (dev hot reload).
export function defineModel(name: string, schema: Schema): Model<any> {
  if (mongoose.models[name]) mongoose.deleteModel(name);
  return mongoose.model(name, schema) as unknown as Model<any>;
}
