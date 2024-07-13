import axios from 'axios';
import { IPayment } from '../models/Payment';

const METHOD_API_BASE_URL = 'https://api.methodfi.com';
const METHOD_API_KEY = process.env.METHOD_API_KEY || 'your-api-key-here';

const methodApi = axios.create({
  baseURL: METHOD_API_BASE_URL,
  headers: {
    Authorization: `Bearer ${METHOD_API_KEY}`,
    'Content-Type': 'application/json'
  }
});

class MethodApiService {
  async createCorporateEntity(payor: any) {
    const { DunkinId, Name, DBA, EIN } = payor;
    const response = await methodApi.post('/entities', {
      type: 'corporation',
      ein: EIN,
      corporation: {
        name: Name,
        dba: DBA,
        owners: []
      }
    });
    return response.data;
  }

  async createIndividualEntity(employee: any) {
    const { FirstName, LastName, DOB, PhoneNumber } = employee;
    const response = await methodApi.post('/entities', {
      type: 'individual',
      individual: {
        first_name: FirstName,
        last_name: LastName,
        dob: DOB,
        phone: PhoneNumber
      }
    });
    return response.data;
  }

  async createAccount(entityId: string, accountNumber: string, routingNumber: string) {
    const response = await methodApi.post('/accounts', {
      entity_id: entityId,
      ach: {
        account: accountNumber,
        routing: routingNumber
      }
    });
    return response.data;
  }

  async processPayment(payment: IPayment) {
    try {
      const { employee, payor, payee, amount } = payment;

      const payorEntity = await this.createCorporateEntity(payor);

      const employeeEntity = await this.createIndividualEntity(employee);

      const payorAccount = await this.createAccount(payorEntity.id, payor.AccountNumber, payor.ABARouting);

      const merchantResponse = await methodApi.get(`/merchants?plaid_id=${payee.PlaidId}`);
      const merchant = merchantResponse.data.data[0];

      const paymentResponse = await methodApi.post('/payments', {
        amount: {
          currency: 'USD',
          amount: Math.round(amount * 100) // Convert to cents
        },
        source: {
          account_id: payorAccount.id
        },
        destination: {
          merchant_id: merchant.id,
          type: 'loan',
          account_number: payee.LoanAccountNumber
        },
        description: `Student loan payment for ${employee.FirstName} ${employee.LastName}`
      });

      return { success: true, data: paymentResponse.data };
    } catch (error: any) {
      console.error('Error processing payment:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new MethodApiService();
