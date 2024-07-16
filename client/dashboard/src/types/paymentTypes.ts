export interface PaymentRequest {
  paymentRequestId: string;
  employee: {
    dunkinId: string;
    firstName: string;
    lastName: string;
  };
  payee: {
    plaidId: string;
  };
  payor: {
    dunkinId: string;
    ein: string;
    name: string;
  };
  amount: number;
  status: string;
  message: string;
}
