import {IPaymentRequest, PaymentRequest} from '../models/PaymentRequest';
import methodApiService from './methodApiService';
import { v4 as uuid } from 'uuid';
import {Payment} from "../models/Payment";
import {CorporateEntity} from "../models/CorporateEntity";
import {IndividualEntity} from "../models/IndividualEntity";
import {PayeeAccount} from "../models/PayeeAccount";
import {PayorAccount} from "../models/PayorAccount";
import {PaymentStatus} from "../models/Payment";

export class PaymentService {
  async createPaymentRequestsForBatch(xmlData: any, batchId: string): Promise<IPaymentRequest[]> {
    const paymentRequestsData = xmlData.root.row.map((row: any) => ({
      paymentRequestId: uuid(),
      batchId: batchId,
      employee: {
        dunkinId: row.Employee[0].DunkinId[0],
        dunkinBranch: row.Employee[0].DunkinBranch[0],
        firstName: row.Employee[0].FirstName[0],
        lastName: row.Employee[0].LastName[0],
        dob: row.Employee[0].DOB[0],
        phoneNumber: row.Employee[0].PhoneNumber[0]
      },
      payor: {
        dunkinId: row.Payor[0].DunkinId[0],
        abaRouting: row.Payor[0].ABARouting[0],
        accountNumber: row.Payor[0].AccountNumber[0],
        name: row.Payor[0].Name[0],
        dba: row.Payor[0].DBA[0],
        ein: row.Payor[0].EIN[0],
        address: {
          line1: row.Payor[0].Address[0].Line1[0],
          city: row.Payor[0].Address[0].City[0],
          state: row.Payor[0].Address[0].State[0],
          zip: row.Payor[0].Address[0].Zip[0]
        }
      },
      payee: {
        plaidId: row.Payee[0].PlaidId[0],
        loanAccountNumber: row.Payee[0].LoanAccountNumber[0]
      },
      amount: Math.round(parseFloat(row.Amount[0].replace('$', '')) * 100) / 100,
      status: PaymentStatus.Unprocessed
    }));
    const paymentRequestsDocs = await PaymentRequest.insertMany(paymentRequestsData);
    return paymentRequestsDocs.map(doc => doc.toObject());
  }
  async generateReport(type: string): Promise<any> {
    let report;
    if (type === 'totalAmountPerSource') {
      report = await PaymentRequest.aggregate([
        { $group: { _id: '$payor.DunkinId', totalAmount: { $sum: '$amount' } } }
      ]);
    } else if (type === 'totalAmountPerBranch') {
      report = await PaymentRequest.aggregate([
        { $group: { _id: '$employee.DunkinBranch', totalAmount: { $sum: '$amount' } } }
      ]);
    } else if (type === 'paymentStatus') {
      report = await PaymentRequest.find({}, { employee: 1, amount: 1, status: 1 });
    }
    return report;
  }

  async discardPaymentRequestsForBatch(batchId: any) {
    console.log('Setting payment requests status to Discarded for batch:', batchId);
    await PaymentRequest.updateMany({ batchId: batchId }, { status: PaymentStatus.Discarded });
  }

  async processPaymentRequestsForBatch(batchId: any) {
    console.log('Processing payment requests for batch:', batchId);
    const paymentRequests = await PaymentRequest.find({ batchId: batchId });
    const merchantsByPlaidId = await methodApiService.getMerchantsByPlaidId();
    for (const paymentRequest of paymentRequests) {
      await methodApiService.processPaymentRequest(paymentRequest, merchantsByPlaidId);
    }
  }

  async getPaymentRequestsByBatchId(batchId: any) {
    return PaymentRequest.find({ batchId: batchId });
  }
}

export default new PaymentService();