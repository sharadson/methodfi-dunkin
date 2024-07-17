import {IPaymentRequest, PaymentRequest} from '../models/PaymentRequest';
import methodApiService, {IMerchantDetail} from './methodApiService';
import {v4 as uuid} from 'uuid';
import {PaymentStatus} from "../models/Payment";
import {IPayeeAccount, PayeeAccount} from "../models/PayeeAccount";
import {IPayorAccount, PayorAccount} from "../models/PayorAccount";
import {IIndividualEntity, IndividualEntity} from "../models/IndividualEntity";
import {CorporateEntity, ICorporateEntity} from "../models/CorporateEntity";

export interface MethodCache {
  corporateEntities: Record<string, ICorporateEntity>;
  individualEntities: Record<string, IIndividualEntity>;
  payorAccounts: Record<string, IPayorAccount>;
  payeeAccounts: Record<string, IPayeeAccount>;
  merchantsByPlaidId: Record<string, IMerchantDetail>;
}
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
      amount: row.Amount[0].replace('$', ''),
      status: PaymentStatus.Unprocessed
    }));
    const paymentRequestsDocs = await PaymentRequest.insertMany(paymentRequestsData);
    return paymentRequestsDocs.map(doc => doc.toObject());
  }

  async discardPaymentRequestsForBatch(batchId: any) {
    console.log('Setting payment requests status to Discarded for batch:', batchId);
    await PaymentRequest.updateMany({ batchId: batchId }, { status: PaymentStatus.Discarded });
  }

  async processPaymentRequestsForBatch(batchId: any) {
    console.log('Processing payment requests for batch:', batchId);

    const methodCache: MethodCache = {
      corporateEntities: {},
      individualEntities: {},
      payorAccounts: {},
      payeeAccounts: {},
      merchantsByPlaidId: {}
    };

    const corporateEntitiesList = await CorporateEntity.find();
    corporateEntitiesList.forEach(entity => {
      methodCache.corporateEntities[entity.ein] = entity;
    });

    const individualEntitiesList = await IndividualEntity.find();
    individualEntitiesList.forEach(entity => {
      methodCache.individualEntities[entity.dunkinId] = entity;
    });

    const payorAccountsList = await PayorAccount.find();
    payorAccountsList.forEach(account => {
      methodCache.payorAccounts[account.dunkinId] = account;
    });

    const payeeAccountsList = await PayeeAccount.find();
    payeeAccountsList.forEach(account => {
      methodCache.payeeAccounts[account.plaidId] = account;
    });

    methodCache.merchantsByPlaidId = await methodApiService.getMerchantsByPlaidId();

    const paymentRequests = await PaymentRequest.find({ batchId: batchId });

    await methodApiService.processPaymentRequestsInBatches(batchId, paymentRequests, methodCache);
  }

  async getPaymentRequestsByBatchId(batchId: any) {
    return PaymentRequest.find({ batchId: batchId });
  }
}

export default new PaymentService();