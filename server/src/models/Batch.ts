import mongoose from 'mongoose';
import { v4 as uuid } from 'uuid';

export enum BatchStatus {
  Pending = 'Pending',
  Approved = 'Approved',
  Processing = 'Processing',
  Processed = 'Processed',
  Discarded = 'Discarded'
}

export interface IBatch extends mongoose.Document {
  id: string;
  fileName: string;
  status: string;
  uploadedAt: Date;
}

const batchSchema = new mongoose.Schema({
  id: { type: String, default: uuid(), unique: true, required: true },
  fileName: { type: String, required: true },
  status: { type: String, enum: Object.values(BatchStatus), default: BatchStatus.Pending },
  uploadedAt: { type: Date, default: Date.now }
});

export const Batch = mongoose.model<IBatch>('Batch', batchSchema);
