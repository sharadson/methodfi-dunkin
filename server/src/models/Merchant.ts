import mongoose, { Document, Schema } from 'mongoose';

export interface MerchantDetails {
  id: string;
  name: string;
}

export interface IMerchant extends Document {
  merchantId: string;
  plaidId: string;
}

const MerchantSchema: Schema = new Schema({
  plaidId: { type: String, required: true, unique: true },
  merchantId: { type: String, required: true},
});

export const Merchant = mongoose.model<IMerchant>('Merchant', MerchantSchema);