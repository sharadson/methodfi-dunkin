// CorporateEntity.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface ICorporateEntity extends Document {
  entityId: string;
  ein: string;
}

const CorporateEntitySchema: Schema = new Schema({
  entityId: { type: String, required: true },
  ein: { type: String, required: true },
});

export const CorporateEntity = mongoose.model<ICorporateEntity>('CorporateEntity', CorporateEntitySchema);