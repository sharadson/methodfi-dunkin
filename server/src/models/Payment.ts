import mongoose, { Document, Schema } from 'mongoose';
import { IPayorAccount } from './PayorAccount';
import { IPayeeAccount } from './PayeeAccount';
import {ICorporateEntity} from "./CorporateEntity";
import {IIndividualEntity} from "./IndividualEntity";


export interface IPayment extends Document {
  paymentId: string;
  paymentRequestId: string;
  corporate: ICorporateEntity;
  employee: IIndividualEntity;
  payor: IPayorAccount;
  payee: IPayeeAccount;
  createdDate: Date;
  amount: number;
  status: string;
  message: string;
}


const PaymentSchema: Schema = new Schema({
  paymentId : { type: String, required: false },
  paymentRequestId: { type: String, required: true },
  corporate: { type: String, ref: 'CorporateEntity', required: false },
  employee: { type: String, ref: 'IndividualEntity', required: false },
  payor: { type: String, ref: 'PayorAccount', required: false },
  payee: { type: String, ref: 'PayeeAccount', required: false },
  createdAt: { type: Date, required: true },
  status: { type: String, required: true },
  amount: { type: Number, required: true },
  message: { type: String, required: true }
});

export const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);