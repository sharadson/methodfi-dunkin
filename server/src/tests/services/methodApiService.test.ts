import fs from 'fs/promises';
import path from 'path';
import mongoose from 'mongoose';
import { IPaymentRequest } from '../../models/PaymentRequest';
import MethodApiService from '../../services/methodApiService';
import PaymentService from "../../services/paymentService";
import xml2js from 'xml2js';
import { Payment } from "../../models/Payment";
import methodApiService from "../../services/methodApiService";

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI as string);
});

afterEach(async () => {
  await mongoose.connection.dropDatabase();
});

afterAll(async () => {
  await mongoose.connection.close();
});

let batchId = 'batchId_1';

describe('Process PaymentRequest Uploaded via XML', () => {
  it('should upload an XML, parse it, and process a paymentRequest', async () => {
    const xmlFilePath = path.join(__dirname, '..', 'data', 'paymentRequest.xml');
    const xmlContent = await fs.readFile(xmlFilePath, 'utf8');

    const parsedXml = await xml2js.parseStringPromise(xmlContent);

    const paymentRequest = await convertXmlToPaymentRequest(parsedXml);
    const merchantsByPlaidId = await methodApiService.getMerchantsByPlaidId();
    await MethodApiService.processPaymentRequest(batchId, paymentRequest, merchantsByPlaidId);

    const payment = await Payment.findOne({ paymentRequestId: paymentRequest.paymentRequestId });
    expect(payment?.status).toBe('pending');
  }, 15000);
});

async function convertXmlToPaymentRequest(parsedXml: any): Promise<IPaymentRequest> {
  const paymentRequests = await PaymentService.createPaymentRequestsForBatch(parsedXml, batchId);
  return paymentRequests[0];
}