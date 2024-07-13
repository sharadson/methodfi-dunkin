import * as React from 'react';

import Button from '@mui/material/Button';

interface PaymentSummaryProps {
  payments: any[];
  onApprove: () => void;
  onDiscard: () => void;
}

const PaymentReviewComponent: React.FC<PaymentSummaryProps> = ({ payments, onApprove, onDiscard }) => {
  return (
    <div>
      <h2>Payment Review</h2>
      <ul>
        {payments.map((payment, index) => (
          <li key={index}>{payment}</li>
        ))}
      </ul>
      <Button variant="contained" onClick={onApprove}>Approve</Button>
      <Button variant="contained" onClick={onDiscard}>Discard</Button>
    </div>
  );
};

export default PaymentReviewComponent;