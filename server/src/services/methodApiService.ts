import axios from 'axios';
import {PaymentRequest, IPaymentRequest, IPayor, IPayee, IEmployee} from '../models/PaymentRequest';
import {ICorporateEntity, CorporateEntity} from "../models/CorporateEntity";
import {IIndividualEntity, IndividualEntity} from "../models/IndividualEntity";
import {PayeeAccount} from "../models/PayeeAccount";
import {IPayorAccount, PayorAccount} from "../models/PayorAccount";
import {Payment, PaymentStatus} from "../models/Payment";

const METHOD_API_BASE_URL = 'https://dev.methodfi.com';
const METHOD_API_KEY = process.env.METHOD_API_KEY || 'sk_iUigphRRVh9RpEM8MkTNhWtM';

const methodApi = axios.create({
  baseURL: METHOD_API_BASE_URL,
  headers: {
    Authorization: `Bearer ${METHOD_API_KEY}`,
    'Content-Type': 'application/json'
  }
});

export interface MerchantDetails {
  id: string;
  name: string;
}

class MethodApiService {
  async createCorporateEntity(payor: IPayor) {
    let corporateEntity = await CorporateEntity.findOne({ ein: payor.ein });
    if (corporateEntity) {
      return corporateEntity;
    }
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
    corporateEntity = new CorporateEntity({
      entityId: response.data.data.id, ein: ein
    });
    await corporateEntity.save();
    return corporateEntity;
  }

  async createIndividualEntity(employee: IEmployee) {
    const { firstName, lastName, dob, dunkinId, dunkinBranch } = employee;
    let individualEntity = await IndividualEntity.findOne({ dunkinId });
    if (individualEntity) {
      return individualEntity;
    }
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
    individualEntity = new IndividualEntity({
      entityId: response.data.data.id,
      dunkinId: dunkinId,
      dunkinBranch: dunkinBranch
    });
    await individualEntity.save();
    return individualEntity;
  }

  async createAndVerifyPayorAccount(payor: IPayor, corporateEntity: ICorporateEntity) {
    const { accountNumber, abaRouting, dunkinId } = payor;
    let payorAccount = await PayorAccount.findOne({ accountNumber: accountNumber, abaRouting: abaRouting });
    if (payorAccount) {
      return payorAccount;
    }
    const response = await methodApi.post('/accounts', {
      holder_id: corporateEntity.entityId,
      ach: {
        number: payor.accountNumber,
        routing: payor.abaRouting,
        type: 'checking',
      }
    });
    payorAccount = new PayorAccount({
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
      throw new Error('Account verification failed for payor account: ' + payorAccount.accountId + ' with verification session id: ' + response.data.data.id);
    }
  }

  private createAndVerifyPayeeAccount = async (individualEntity: IIndividualEntity, payee: IPayee, merchantsByPlaidId: Record<string, MerchantDetails>) => {
    let payeeAccount = await PayeeAccount.findOne({ plaidId: payee.plaidId });
    if (payeeAccount) {
      return payeeAccount;
    }
    // Merchant does not exist in Method API
    if (!merchantsByPlaidId[payee.plaidId]) {
      throw new Error('Merchant not found for plaidId: ' + payee.plaidId);
    }
    const merchant = merchantsByPlaidId[payee.plaidId];
    const response = await methodApi.post('/accounts', {
      holder_id: individualEntity.entityId,
      liability: {
        mch_id: merchant.id,
        account_number: payee.loanAccountNumber
      }
    });
    payeeAccount = new PayeeAccount({
      accountId: response.data.data.id, plaidId: payee.plaidId, entityId: individualEntity.entityId
    });
    await payeeAccount.save();
    // await this.verifyPayeeAccount(payeeAccount);
    return payeeAccount
  }

  // private verifyPayeeAccount = async (payeeAccount: IPayeeAccount) => {
  //   const response = await methodApi.post(
  //     `/elements/token`,
  //     {
  //       type: "connect",
  //       entity_id: payeeAccount.entityId,
  //       connect: {
  //         products: ["payment"]
  //       }
  //     }
  //   );
  //
  //   if (!method) {
  //     throw new Error('Method API not initialized');
  //   }
  //   method.open(response.data.data.element_token);
  // }

  // Assuming IPaymentRequest includes status and message fields
  async processPaymentRequest(batchId: string, paymentRequest: IPaymentRequest, merchantsByPlaidId: Record<string, MerchantDetails>) {
    const { paymentRequestId, employee, payor, payee, amount } = paymentRequest;
    let payment = null;
    let corporateEntity = null;
    let individualEntity = null;
    let payorAccount = null;
    let payeeAccount = null;
    try {
      corporateEntity = await this.createCorporateEntity(payor);
      individualEntity = await this.createIndividualEntity(employee);
      payorAccount = await this.createAndVerifyPayorAccount(payor, corporateEntity);
      payeeAccount = await this.createAndVerifyPayeeAccount(individualEntity, payee, merchantsByPlaidId);

      const response = await methodApi.post('/payments', {
        amount: amount * 100, // Convert to cents
        source: payorAccount.accountId,
        destination: 'acc_6AYf8tqziqzmH', // Hardcoded destination account that belongs to active user
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
      console.error('Error processing payment:', error);
      payment = new Payment({
        paymentId: null,
        batchId: batchId,
        paymentRequestId: paymentRequestId,
        corporate: corporateEntity ? corporateEntity.id : null,
        employee: individualEntity ? individualEntity.id : null,
        payee: payeeAccount ? payeeAccount.id : null,
        payor: payorAccount ? payorAccount.id : null,
        employeeDunkinId: individualEntity? individualEntity.dunkinId: null,
        payorDunkinId: payor? payor.dunkinId : null,
        createdAt: new Date(),
        status: PaymentStatus.Failed,
        amount: paymentRequest.amount,
        message: error.message
      });
      await payment.save();
    }

    await PaymentRequest.findOneAndUpdate({ paymentRequestId: paymentRequestId }, {
      status: payment.status,
      message: payment.message
    });
  }

  async getMerchantsByPlaidId() {
    try {
      const response = await methodApi.get(`/merchants`);
      let merchantsByPlaidId: Record<string, MerchantDetails> = {};
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
