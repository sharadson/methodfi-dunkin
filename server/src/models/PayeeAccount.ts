import mongoose, { Document, Schema } from 'mongoose';

export interface IPayeeAccount extends Document {
  accountId: string;
  entityId: string;
  plaidId: string;
}

const PayeeAccountSchema: Schema = new Schema({
  accountId: { type: String, required: true },
  plaidId: { type: String, required: true },
  entityId: { type: String, required: true },
});

export const PayeeAccount = mongoose.model<IPayeeAccount>('PayeeAccount', PayeeAccountSchema);
