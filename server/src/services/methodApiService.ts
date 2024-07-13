import axios from 'axios';
import {IPaymentRequest, IPayor, IPayee, IEmployee} from '../models/PaymentRequest';
import {ICorporateEntity, CorporateEntity} from "../models/CorporateEntity";
import {IIndividualEntity, IndividualEntity} from "../models/IndividualEntity";
import {Merchant} from "../models/Merchant";
import {PayeeAccount} from "../models/PayeeAccount";
import {PayorAccount} from "../models/PayorAccount";
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
    const {name, dba, ein} = payor;
    const response = await methodApi.post('/entities', {
      type: 'corporation',
      ein: ein,
      corporation: {
        name: name,
        dba: dba,
        owners: []
      }
    });
    corporateEntity = new CorporateEntity({
      entityId: response.data.EntityId, ein: ein
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
    const response = await methodApi.post('/entities', {
      type: 'individual',
      individual: {
        first_name: firstName,
        last_name: lastName,
        dob: dob,
        phone: '+15121231111' // Hardcoded coded phone number as suggested
      }
    });
    individualEntity = new IndividualEntity({
      entityId: response.data.EntityId, dunkinId: dunkinId, dunkinBranch: dunkinBranch
    });
    await individualEntity.save();
    return individualEntity;
  }

  async createPayorAccount(payor: IPayor, corporateEntity: ICorporateEntity) {
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
      accountId: response.data.id, dunkinId: dunkinId, entityId: corporateEntity.entityId
    });
    await payorAccount.save();
    return payorAccount;
  }

  private createPayeeAccount = async (individualEntity: IIndividualEntity, payee: IPayee) => {
    let payeeAccount = await PayeeAccount.findOne({ plaidId: payee.plaidId });
    if (payeeAccount) {
      return payeeAccount;
    }
    let merchant = await Merchant.findOne({ plaidId: payee.plaidId });
    if (!merchant) {
      const merchantResponse = await methodApi.get(`/merchants?plaid_id=${payee.plaidId}`);
      merchant = new Merchant({
        merchantId: merchantResponse.data.data[0],
        plaidId: payee.plaidId
      });
      await merchant.save();
    }

    const response = await methodApi.post('/accounts', {
      holder_id: individualEntity.entityId,
      liability: {
        mch_id: merchant.merchantId,
        plaid_id: payee.plaidId
      }
    });
    payeeAccount = new PayeeAccount({
      accountId: response.data.id, plaidId: payee.plaidId, entityId: individualEntity.entityId
    });
    await payeeAccount.save();
    return payeeAccount
  }

  async processPaymentRequest(paymentRequest: IPaymentRequest) {
    const { paymentRequestId, employee, payor, payee, amount } = paymentRequest;

    try {
      const corporateEntity = await this.createCorporateEntity(payor);

      const individualEntity = await this.createIndividualEntity(employee);

      const payorAccount = await this.createPayorAccount(payor, corporateEntity);

      const payeeAccount = await this.createPayeeAccount(individualEntity, payee);

      const response = await methodApi.post('/payments', {
        amount: {
          currency: 'USD',
          amount: Math.round(amount * 100) // Convert to cents
        },
        source:  payorAccount.id,
        destination: payeeAccount.id,
        description: `Student loan payment for ${employee.firstName} ${employee.lastName}`
      });

      const payment = new Payment({
        id: response.data.id,
        paymentRequestId: paymentRequestId,
        corporate: corporateEntity.entityId,
        employee: individualEntity.entityId,
        payee: payeeAccount.accountId,
        payor: payorAccount.accountId,
        amount: amount,
        createdAt: new Date(),
        status: response.data.status,
        message: 'Success'
      });
      await payment.save();
    } catch (error: any) {
      console.error('Error processing payment:', error);
      const payment = new Payment({
        paymentRequestId: paymentRequestId,
        corporate: null,
        employee: null,
        payee: null,
        payor: null,
        amount: paymentRequest.amount,
        createdAt: new Date(),
        status: 'Failed',
        message: error.message
      });
    }
  }
}

export default new MethodApiService();
