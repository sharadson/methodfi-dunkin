import * as React from 'react';
import axios from 'axios';

import Button from '@mui/material/Button';

interface PaymentSummaryProps {
  payments: any[];
  onApprove: () => void;
  onDiscard: () => void;
}


const onApprove = async () => {
  console.log('Approve');

  try {
    const response = await axios.post('http://localhost:5001/api/approve');

    if (response.status === 200) {
      console.log('All collections Processed');
    } else {
      console.error('Error processing collections:', response.statusText);
    }
  } catch (error) {
    console.error('Error processing collections:', error);
  }
};


const onDiscard = async () => {
  console.log('Discard');

  try {
    const response = await axios.post('http://localhost:5001/api/discard');

    if (response.status === 200) {
      console.log('All collections cleared');
    } else {
      console.error('Error clearing collections:', response.statusText);
    }
  } catch (error) {
    console.error('Error clearing collections:', error);
  }
};

const PaymentComponent: React.FC<PaymentSummaryProps> = ({ payments}) => {
  return (
    <div>
      <h2>Payment Review</h2>
      <ul>
        {payments.map((payment, index) => (
          <li key={index}>{payment}</li>
        ))}
      </ul>
      <Button variant="contained" onClick={onApprove} style={{ marginRight: '10px' }}>Approve</Button>
      <Button variant="contained" onClick={onDiscard}>Discard</Button>
    </div>
  );
};

export default PaymentComponent;