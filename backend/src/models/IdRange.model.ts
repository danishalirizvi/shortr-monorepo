import { Schema, model } from 'mongoose';

// Single-document collection that acts as the distributed atomic counter.
// The _id 'global' is the only document. counter is incremented atomically
// by each server instance to claim a unique ID range.
interface IIdRange {
  _id: string;
  counter: number;
}

const idRangeSchema = new Schema<IIdRange>(
  {
    _id:     { type: String },
    counter: { type: Number, default: 0 },
  },
  { versionKey: false },
);

export const IdRange = model<IIdRange>('IdRange', idRangeSchema);
