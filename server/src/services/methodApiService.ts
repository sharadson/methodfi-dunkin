import axios from 'axios';
import {PaymentRequest, IPaymentRequest, IPayor, IPayee, IEmployee} from '../models/PaymentRequest';
import {ICorporateEntity, CorporateEntity} from "../models/CorporateEntity";
import {IIndividualEntity, IndividualEntity} from "../models/IndividualEntity";
import {PayeeAccount} from "../models/PayeeAccount";
import {IPayorAccount, PayorAccount} from "../models/PayorAccount";
import {Payment, PaymentStatus} from "../models/Payment";
import {MethodCache} from "./paymentService";
import { chunk } from 'lodash';
import ApiError from "../utils/apiError";


const MAX_CONCURRENT_REQUESTS = 80;
const METHOD_API_BASE_URL = 'https://dev.methodfi.com';
const METHOD_API_KEY = process.env.METHOD_API_KEY || 'sk_iUigphRRVh9RpEM8MkTNhWtM';

const methodApi = axios.create({
  baseURL: METHOD_API_BASE_URL,
  headers: {
    Authorization: `Bearer ${METHOD_API_KEY}`,
    'Content-Type': 'application/json'
  }
});

export interface IMerchantDetail {
  id: string;
  name: string;
}

class MethodApiService {
  async createCorporateEntity(payor: IPayor) {
    const {name, dba, ein, address} = payor;
    const response = await methodApi.post('/entities', {
      type: 'corporation',
      corporation: {
        name: name,
        dba: dba,
        ein: ein,
        owners: []
      },
      address: {
        line1: address.line1,
        city: address.city,
        state: address.state,
        zip: address.zip
      }
    });
    let corporateEntity = new CorporateEntity({
      entityId: response.data.data.id, ein: ein
    });
    await corporateEntity.save();
    return corporateEntity;
  }

  async createIndividualEntity(employee: IEmployee) {
    const { firstName, lastName, dob, dunkinId, dunkinBranch } = employee;
    const [month, day, year] = employee.dob.split("-");
    const formattedDob = `${year}-${month}-${day}`;

    const response = await methodApi.post('/entities', {
      type: 'individual',
      individual: {
        first_name: firstName,
        last_name: lastName,
        dob: formattedDob,
        phone: '+15121231111' // Hardcoded coded phone number as suggested
      }
    });
    let individualEntity = new IndividualEntity({
      entityId: response.data.data.id,
      dunkinId: dunkinId,
      dunkinBranch: dunkinBranch
    });
    await individualEntity.save();
    return individualEntity;
  }

  async createAndVerifyPayorAccount(payor: IPayor, corporateEntity: ICorporateEntity) {
    const {dunkinId } = payor;
    const response = await methodApi.post('/accounts', {
      holder_id: corporateEntity.entityId,
      ach: {
        number: payor.accountNumber,
        routing: payor.abaRouting,
        type: 'checking',
      }
    });
    let payorAccount = new PayorAccount({
      accountId: response.data.data.id, dunkinId: dunkinId, entityId: corporateEntity.entityId
    });
    await payorAccount.save();
    await this.verifyPayorAccount(payorAccount);
    return payorAccount;
  }

  private verifyPayorAccount = async (payorAccount: IPayorAccount) => {
    let response = await methodApi.post(
      `/accounts/${payorAccount.accountId}/verification_sessions`,
      {
        type: 'plaid',
      }
    );
    response = await methodApi.put(`/accounts/${payorAccount.accountId}/verification_sessions/${response.data.data.id}`, {
      plaid: {
        balances : {
          available : 0,
          current : 0,
          iso_currency_code : 'USD',
          limit : null,
          unofficial_currency_code : null
        },
        transactions: []
      }
    });
    if (response.data.data.status !== 'verified') {
      throw new ApiError('Account verification failed for payor account: ' + payorAccount.accountId + ' with verification session id: ' + response.data.data.id, 451);
    }
  }

  private createAndVerifyPayeeAccount = async (individualEntity: IIndividualEntity, payee: IPayee, merchantsByPlaidId: Record<string, IMerchantDetail>) => {
    // Merchant does not exist in Method API
    if (!merchantsByPlaidId[payee.plaidId]) {
      throw new ApiError('Merchant not found for plaidId: ' + payee.plaidId, 452);
    }
    const merchant = merchantsByPlaidId[payee.plaidId];
    const response = await methodApi.post('/accounts', {
      holder_id: individualEntity.entityId,
      liability: {
        mch_id: merchant.id,
        account_number: payee.loanAccountNumber
      }
    });
    let payeeAccount = new PayeeAccount({
      accountId: response.data.data.id, plaidId: payee.plaidId, entityId: individualEntity.entityId
    });
    await payeeAccount.save();
    // Payee (individual entity) verification can not be done only on server side
    // await this.verifyPayeeAccount(payeeAccount);
    return payeeAccount
  }

  async processPaymentRequestsInBatches(batchId: string, paymentRequests: IPaymentRequest[], cache: MethodCache) {
    const chunks = chunk(paymentRequests, MAX_CONCURRENT_REQUESTS);

    for (const localChunk of chunks) {
      await Promise.all(localChunk.map(async (request) => {
        try {
          await this.processPaymentRequestWithRetry(batchId, request, cache);
        } catch (error) {
          console.error('Error processing payments request in batches:', error);
        }
      }));
    }
  }

  async processPaymentRequestWithRetry(batchId: string, request: IPaymentRequest, cache: MethodCache, retries = 7, delay = 1000): Promise<void> {
    try {
      await this.processPaymentRequest(batchId, request, cache);
    } catch (error: any) {
      if (error.response && error.response.status === 429 && retries > 0) {
        console.warn('Rate limit exceeded, retrying after delay...', { retries, delay });
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.processPaymentRequestWithRetry(batchId, request, cache, retries - 1, delay * 2); // Exponential backoff
      } else {
        console.error('Error processing payment request:', error);
        throw error;
      }
    }
  }

  async processPaymentRequest(batchId: string, paymentRequest: IPaymentRequest, cache: MethodCache) {
    const { paymentRequestId, employee, payor, payee, amount } = paymentRequest;
    let payment = null;
    let corporateEntity = null;
    let individualEntity = null;
    let payorAccount = null;
    let payeeAccount = null;
    try {
      if (cache.corporateEntities[payor.ein]) {
        corporateEntity = cache.corporateEntities[payor.ein];
      } else {
        corporateEntity = await this.createCorporateEntity(payor);
        cache.corporateEntities[payor.ein] = corporateEntity;
      }

      if (cache.individualEntities[employee.dunkinId]) {
        individualEntity = cache.individualEntities[employee.dunkinId];
      } else {
        individualEntity = await this.createIndividualEntity(employee);
        cache.individualEntities[employee.dunkinId] = individualEntity;
      }

      if (cache.payorAccounts[payor.dunkinId]) {
        payorAccount = cache.payorAccounts[payor.dunkinId];
      } else {
        payorAccount = await this.createAndVerifyPayorAccount(payor, corporateEntity);
        cache.payorAccounts[payor.dunkinId] = payorAccount;
      }

      if (cache.payeeAccounts[payee.plaidId]) {
        payeeAccount = cache.payeeAccounts[payee.plaidId];
      } else {
        payeeAccount = await this.createAndVerifyPayeeAccount(individualEntity, payee, cache.merchantsByPlaidId);
        cache.payeeAccounts[payee.plaidId] = payeeAccount;
      }


      const response = await methodApi.post('/payments', {
        amount: Math.round(parseFloat(amount) * 100),
        source: payorAccount.accountId,
        // IMP: For demo purpose, and given individual entity can not be verified automatically on server side,
        // destination account for individual entity/payee is hardcoded below
        // relevant payee for this account is verified using Method Element UI workflow: react-method-elements (e.g. SMS verification, debt account selections etc)
        destination: 'acc_6AYf8tqziqzmH',
        description: `Loan pmt`
      });

      payment = new Payment({
        paymentId: response.data.data.id,
        batchId: batchId,
        paymentRequestId: paymentRequestId,
        corporate: corporateEntity.id,
        employee: individualEntity.id,
        payee: payeeAccount.id,
        payor: payorAccount.id,
        employeeDunkinId: individualEntity.dunkinId,
        payorDunkinId: payor.dunkinId,
        amount: amount,
        createdAt: new Date(),
        status: response.data.data.status == 'pending' ? PaymentStatus.Pending : PaymentStatus.Failed,
        message: response.data.data.status == 'pending' ?'Success' : 'Failed'
      });
      await payment.save();
    } catch (error: any) {
      if (error.response && error.response.status !== 429) {
        payment = new Payment({
          paymentId: null,
          batchId: batchId,
          paymentRequestId: paymentRequestId,
          corporate: corporateEntity ? corporateEntity.id : null,
          employee: individualEntity ? individualEntity.id : null,
          payee: payeeAccount ? payeeAccount.id : null,
          payor: payorAccount ? payorAccount.id : null,
          employeeDunkinId: individualEntity ? individualEntity.dunkinId : null,
          payorDunkinId: payor ? payor.dunkinId : null,
          createdAt: new Date(),
          status: PaymentStatus.Failed,
          amount: paymentRequest.amount,
          message: error.message
        });
        await payment.save();
      }
      else {
        throw error;
      }
    }

    await PaymentRequest.findOneAndUpdate({ paymentRequestId: paymentRequestId }, {
      status: payment.status,
      message: payment.message
    });
  }

  async getMerchantsByPlaidId() {
    try {
      const response = await methodApi.get(`/merchants`);
      let merchantsByPlaidId: Record<string, IMerchantDetail> = {};
      if (response.data && response.data.data.length > 0) {
        const merchants = response.data.data;
        for (const merchant of merchants) {
          const uniquePlaidIds = new Set<string>(merchant.provider_ids['plaid']);
          for (const plaidId of uniquePlaidIds) {
            if (!merchantsByPlaidId[plaidId]) {
              merchantsByPlaidId[plaidId] = {
                id: merchant.id,
                name: merchant.name,
              };
            }
            else {
              console.error('plaidId found assigned to more than one merchant:', plaidId, merchant);
            }
          }
        }
      }
      return merchantsByPlaidId;
    } catch (error) {
      console.error('Error fetching merchants by Plaid ID:', error);
      throw error;
    }
  }

}

export default new MethodApiService();
