import { Schema, model, Document } from 'mongoose';

export interface IClick extends Document {
  shortCode: string;
  ip: string;
  userAgent: string;
  timestamp: Date;
}

const clickSchema = new Schema<IClick>(
  {
    shortCode: { type: String, required: true, index: true },
    ip:        { type: String, required: true },
    userAgent: { type: String, default: '' },
  },
  { timestamps: { createdAt: 'timestamp', updatedAt: false } },
);

// Index for time-series analytics queries
clickSchema.index({ timestamp: -1 });

export const Click = model<IClick>('Click', clickSchema);
