import mongoose, { type Document, Schema } from 'mongoose';

export interface IRateLimit extends Document {
  key: string;
  count: number;
  expiresAt: Date;
}

const rateLimitSchema = new Schema<IRateLimit>({
  key: { type: String, required: true, unique: true, index: true },
  count: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true, index: true },
});

// TTL index — MongoDB automatically deletes expired documents
rateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RateLimit = mongoose.model<IRateLimit>(
  'RateLimit',
  rateLimitSchema,
);
