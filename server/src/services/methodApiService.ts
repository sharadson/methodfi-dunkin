import axios from 'axios';
import {IPaymentRequest, IPayor, IPayee, IEmployee} from '../models/PaymentRequest';
import {ICorporateEntity, CorporateEntity} from "../models/CorporateEntity";
import {IIndividualEntity, IndividualEntity} from "../models/IndividualEntity";
import {Merchant, MerchantDetails} from "../models/Merchant";
import {PayeeAccount} from "../models/PayeeAccount";
import {IPayorAccount, PayorAccount} from "../models/PayorAccount";
import {Payment} from "../models/Payment";

const METHOD_API_BASE_URL = 'https://dev.methodfi.com';
const METHOD_API_KEY = process.env.METHOD_API_KEY || 'sk_iUigphRRVh9RpEM8MkTNhWtM';

const methodApi = axios.create({
  baseURL: METHOD_API_BASE_URL,
  headers: {
    Authorization: `Bearer ${METHOD_API_KEY}`,
    'Content-Type': 'application/json'
  }
});

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

  private createAndVerifyPayeeAccount = async (individualEntity: IIndividualEntity, payee: IPayee) => {
    let payeeAccount = await PayeeAccount.findOne({ plaidId: payee.plaidId });
    if (payeeAccount) {
      return payeeAccount;
    }
    let merchant = await Merchant.findOne({ plaidId: payee.plaidId });
    if (!merchant) { // Repopulate all the merchants if merchant not found
      const merchantsByPlaidId = await this.getMerchantsByPlaidId();
      for (const plaidId in merchantsByPlaidId) {
        const merchant = new Merchant({
          merchantId: merchantsByPlaidId[plaidId].id,
          plaidId: plaidId
        });
        await merchant.save();
      }
      merchant = await Merchant.findOne({ plaidId: payee.plaidId });
    }
    if (!merchant) {
      // Merchant does not exist in Method API
      throw new Error('Merchant not found for plaidId: ' + payee.plaidId);
    }
    const response = await methodApi.post('/accounts', {
      holder_id: individualEntity.entityId,
      liability: {
        mch_id: merchant.merchantId,
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

  async processPaymentRequest(paymentRequest: IPaymentRequest) {
    const { paymentRequestId, employee, payor, payee, amount } = paymentRequest;

    try {
      const corporateEntity = await this.createCorporateEntity(payor);

      const individualEntity = await this.createIndividualEntity(employee);

      const payorAccount = await this.createAndVerifyPayorAccount(payor, corporateEntity);

      const payeeAccount = await this.createAndVerifyPayeeAccount(individualEntity, payee);

      const response = await methodApi.post('/payments', {
        amount: amount * 100, // Convert to cents
        source:  payorAccount.accountId,
        // destination: payeeAccount.accountId,
        // IMP: Hardcoding a destination account whose holder is verified using Method Element
        // Doing this as there is no programmatic way to verify the individual account holder. And we can not deposit payment in unverified individual entities
        destination: 'acc_6AYf8tqziqzmH',
        description: `Loan pmt`
      });

      const payment = new Payment({
        paymentId: response.data.data.id,
        paymentRequestId: paymentRequestId,
        corporate: corporateEntity.id,
        employee: individualEntity.id,
        payee: payeeAccount.id,
        payor: payorAccount.id,
        amount: amount,
        createdAt: new Date(),
        status: response.data.data.status,
        message: 'Success'
      });
      await payment.save();
    } catch (error: any) {
      console.error('Error processing payment:', error);
      const payment = new Payment({
        paymentId: '',
        paymentRequestId: paymentRequestId,
        corporate: '',
        employee: '',
        payee: '',
        payor: '',
        createdAt: new Date(),
        status: 'Failed',
        amount: paymentRequest.amount,
        message: error.message
      });
      await payment.save();
    }
  }

  async getMerchantsByPlaidId() {
    try {
      // Make a GET request to the `/merchants` endpoint with plaidId as a query parameter
      const response = await methodApi.get(`/merchants`);
      // Initialize an empty object to hold the merchants data
      let merchantsByPlaidId: Record<string, MerchantDetails> = {};      // Check if the response data is not empty
      if (response.data && response.data.data.length > 0) {
        const merchants = response.data.data;
        // Iterate through the list of merchants returned by the API
        for (const merchant of merchants) {
          // Use the merchant's plaid_id as the key and assign the merchant's details as the value
          for (const plaidId of merchant.provider_ids['plaid']) {
            merchantsByPlaidId[plaidId] = {
              id: merchant.id,
              name: merchant.name,
            };
          }
        }
      }
      return merchantsByPlaidId;
    } catch (error) {
      console.error('Error fetching merchants by Plaid ID:', error);
      // Handle the error appropriately
      throw error;
    }
  }

}

export default new MethodApiService();
