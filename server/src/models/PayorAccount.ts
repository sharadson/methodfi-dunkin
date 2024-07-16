// Payee.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IPayorAccount extends Document {
  accountId: string;
  dunkinId: string;
  entityId: string;
}

const PayorAccountSchema: Schema = new Schema({
  accountId: { type: String, required: true },
  dunkinId: { type: String, required: true },
  entityId: { type: String, required: true },
});

export const PayorAccount = mongoose.model<IPayorAccount>('PayorAccount', PayorAccountSchema);