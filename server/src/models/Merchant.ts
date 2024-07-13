import mongoose, { Document, Schema } from 'mongoose';

export interface IMerchant extends Document {
  merchantId: string;
  plaidId: string;
}

const MerchantSchema: Schema = new Schema({
  merchantId: { type: String, required: true, unique: true },
  plaidId: { type: String, required: true },
});

export const Merchant = mongoose.model<IMerchant>('Merchant', MerchantSchema);