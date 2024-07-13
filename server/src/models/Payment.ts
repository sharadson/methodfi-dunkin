import mongoose, { Document, Schema } from 'mongoose';

export interface IEmployee {
  DunkinId: string;
  DunkinBranch: string;
  FirstName: string;
  LastName: string;
  DOB: string;
  PhoneNumber: string;
}

export interface IPayor {
  DunkinId: string;
  ABARouting: string;
  AccountNumber: string;
  Name: string;
  DBA: string;
  EIN: string;
  Address: {
    Line1: string;
    City: string;
    State: string;
    Zip: string;
  };
}

export interface IPayee {
  PlaidId: string;
  LoanAccountNumber: string;
}

export interface IPayment extends Document {
  employee: IEmployee;
  payor: IPayor;
  payee: IPayee;
  amount: number;
  status: 'Pending' | 'Processed' | 'Failed';
}

const EmployeeSchema: Schema = new Schema({
  DunkinId: { type: String, required: true },
  DunkinBranch: { type: String, required: true },
  FirstName: { type: String, required: true },
  LastName: { type: String, required: true },
  DOB: { type: String, required: true },
  PhoneNumber: { type: String, required: true }
});

const PayorSchema: Schema = new Schema({
  DunkinId: { type: String, required: true },
  ABARouting: { type: String, required: true },
  AccountNumber: { type: String, required: true },
  Name: { type: String, required: true },
  DBA: { type: String, required: true },
  EIN: { type: String, required: true },
  Address: {
    Line1: { type: String, required: true },
    City: { type: String, required: true },
    State: { type: String, required: true },
    Zip: { type: String, required: true }
  }
});

const PayeeSchema: Schema = new Schema({
  PlaidId: { type: String, required: true },
  LoanAccountNumber: { type: String, required: true }
});

const PaymentSchema: Schema = new Schema({
  employee: { type: EmployeeSchema, required: true },
  payor: { type: PayorSchema, required: true },
  payee: { type: PayeeSchema, required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['Pending', 'Processed', 'Failed'], default: 'Pending' }
});

export const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);