import { Schema, model, Document } from 'mongoose';

export interface IShortUrl extends Document {
  shortCode: string;
  originalUrl: string;
  createdAt: Date;
  createdByIp: string;
}

const shortUrlSchema = new Schema<IShortUrl>(
  {
    shortCode:   { type: String, required: true, unique: true, index: true },
    originalUrl: { type: String, required: true },
    createdByIp: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const ShortUrl = model<IShortUrl>('ShortUrl', shortUrlSchema);
