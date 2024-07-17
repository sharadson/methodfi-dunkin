import { Document, Schema, Model, model } from 'mongoose';
import { PaymentStatus } from './Payment';

export interface IEmployee {
  dunkinId: string;
  dunkinBranch: string;
  firstName: string;
  lastName: string;
  dob: string;
  phoneNumber: string;
}

export interface IAddress {
  line1: string;
  city: string;
  state: string;
  zip: string;
}

export interface IPayor {
  dunkinId: string;
  abaRouting: string;
  accountNumber: string;
  name: string;
  dba: string;
  ein: string;
  address: IAddress;
}

export interface IPayee {
  plaidId: string;
  loanAccountNumber: string;
}


export interface IPaymentRequest extends Document {
  paymentRequestId: string;
  employee: IEmployee;
  payor: IPayor;
  payee: IPayee;
  amount: string;
}

// Define Mongoose schemas
const AddressSchema: Schema = new Schema({
  line1: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zip: { type: String, required: true }
});

const EmployeeSchema: Schema = new Schema({
  dunkinId: { type: String, required: true },
  dunkinBranch: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  dob: { type: String, required: true },
  phoneNumber: { type: String, required: true }
});

const PayorSchema: Schema = new Schema({
  dunkinId: { type: String, required: true },
  abaRouting: { type: String, required: true },
  accountNumber: { type: String, required: true },
  name: { type: String, required: true },
  dba: { type: String, required: true },
  ein: { type: String, required: true },
  address: { type: AddressSchema, required: true }
});

const PayeeSchema: Schema = new Schema({
  plaidId: { type: String, required: true },
  loanAccountNumber: { type: String, required: true }
});

const PaymentRequestSchema: Schema = new Schema({
  batchId: { type: String, ref: 'Batch' },
  paymentRequestId: { type: String, required: true },
  employee: { type: EmployeeSchema, required: true },
  payor: { type: PayorSchema, required: true },
  payee: { type: PayeeSchema, required: true },
  amount: { type: Number, required: true },
  status: { type: String, required: true, enum: Object.values(PaymentStatus) },
  message: { type: String, default: '' }
});


export const PaymentRequest: Model<IPaymentRequest> = model<IPaymentRequest>('PaymentRequest', PaymentRequestSchema);
