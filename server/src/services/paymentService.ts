import {IPayment, Payment} from '../models/Payment';
import methodApiService from './methodApiService';

export class PaymentService {
  async createPaymentsFromXML(xmlData: any): Promise<IPayment[]> {
    console.log('xmlData:', xmlData)
    const paymentsData = xmlData.root.row.map((row: any) => ({
      employee: {
        DunkinId: row.Employee[0].DunkinId[0],
        DunkinBranch: row.Employee[0].DunkinBranch[0],
        FirstName: row.Employee[0].FirstName[0],
        LastName: row.Employee[0].LastName[0],
        DOB: row.Employee[0].DOB[0],
        PhoneNumber: row.Employee[0].PhoneNumber[0]
      },
      payor: {
        DunkinId: row.Payor[0].DunkinId[0],
        ABARouting: row.Payor[0].ABARouting[0],
        AccountNumber: row.Payor[0].AccountNumber[0],
        Name: row.Payor[0].Name[0],
        DBA: row.Payor[0].DBA[0],
        EIN: row.Payor[0].EIN[0],
        Address: {
          Line1: row.Payor[0].Address[0].Line1[0],
          City: row.Payor[0].Address[0].City[0],
          State: row.Payor[0].Address[0].State[0],
          Zip: row.Payor[0].Address[0].Zip[0]
        }
      },
      payee: {
        PlaidId: row.Payee[0].PlaidId[0],
        LoanAccountNumber: row.Payee[0].LoanAccountNumber[0]
      },
      amount: parseFloat(row.Amount[0].replace('$', '')),
      status: 'Pending'
    }));
    console.log('paymentsData:', paymentsData)
    const paymentDocs = await Payment.insertMany(paymentsData);
    console.log('paymentDocs:', paymentDocs)
    return paymentDocs.map(doc => doc.toObject());
  }

  async approvePayments(): Promise<IPayment[]> {
    const payments = await Payment.find({ status: 'Pending' });
    for (const payment of payments) {
      const response = await methodApiService.processPayment(payment);
      payment.status = response.success ? 'Processed' : 'Failed';
      await payment.save();
    }
    return payments;
  }

  async generateReport(type: string): Promise<any> {
    let report;
    if (type === 'totalAmountPerSource') {
      report = await Payment.aggregate([
        { $group: { _id: '$payor.DunkinId', totalAmount: { $sum: '$amount' } } }
      ]);
    } else if (type === 'totalAmountPerBranch') {
      report = await Payment.aggregate([
        { $group: { _id: '$employee.DunkinBranch', totalAmount: { $sum: '$amount' } } }
      ]);
    } else if (type === 'paymentStatus') {
      report = await Payment.find({}, { employee: 1, amount: 1, status: 1 });
    }
    return report;
  }
}

export default new PaymentService();