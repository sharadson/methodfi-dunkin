import {PaymentRequest} from '../models/PaymentRequest';
import {Payment, PaymentStatus} from "../models/Payment";


export enum ReportTypes {
  TotalAmountPerSource = 'totalAmountPerSource',
  TotalAmountPerBranch = 'totalAmountPerBranch',
  PaymentStatus = 'paymentStatus',
}

export class ReportService {
  async generateReport(batchId: string, reportType: string): Promise<any> {
    switch (reportType) {
      case ReportTypes.TotalAmountPerSource:
        return this.generateTotalAmountPerSourceReport(batchId);
      case ReportTypes.TotalAmountPerBranch:
        return this.generateTotalAmountPerBranchReport(batchId);
      case ReportTypes.PaymentStatus:
        return this.generatePaymentStatusReport(batchId);
      default:
        throw new Error('Invalid report type');
    }
  }

  async generateTotalAmountPerSourceReport(batchId: string) {
    return PaymentRequest.aggregate([
      {
        $match: {
          status: PaymentStatus.Pending,
          batchId: batchId
        }
      },
      {
        $group: {
          _id: "$payor.accountNumber",
          dunkinId: { $first: "$payor.dunkinId" },
          totalAmount: { $sum: "$amount" }
        }
      },
      {
        $addFields: {
          source: "$_id"
        }
      },
      {
        $project: {
          source: 1,
          dunkinId: 1,
          totalAmount: 1,
          _id: 0
        }
      }
    ]);
  }

  private generateTotalAmountPerBranchReport(batchId: string) {
    return PaymentRequest.aggregate([
      {
        $match: {
          status: PaymentStatus.Pending,
          batchId: batchId
        }
      },
      {
        $group: {
          _id: "$employee.dunkinBranch",
          totalAmount: { $sum: "$amount" }
        }
      },
      {
        $project: {
          branch: "$_id",
          totalAmount: 1,
          _id: 0
        }
      }
    ]);
  }

  private generatePaymentStatusReport(batchId: string) {
    return Payment.find({
      batchId: batchId
    }).select({
      paymentRequestId: 1,
      paymentId: 1,
      employeeDunkinId: 1,
      payorDunkinId: 1,
      amount: 1,
      status: 1,
      createdAt: 1,
      _id: 0
    });
  }
}


export default new ReportService();