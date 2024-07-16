import { DataGrid } from '@mui/x-data-grid';
import * as React from 'react';
import { useEffect, useState } from 'react';
import axios from 'axios';
import Button from '@mui/material/Button';

interface PaymentRequest {
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

interface Batch {
  id: string;
  fileName: string;
  status: string;
  uploadedAt: string;
}

const onApprove = async (batchId: string) => {
  console.log('Approve');

  try {
    const response = await axios.post(`http://localhost:5001/api/approve?batchId=${batchId}`);

    if (response.status === 200) {
      console.log('All collections Processed');
    } else {
      console.error('Error processing collections:', response.statusText);
    }
  } catch (error) {
    console.error('Error processing collections:', error);
  }
};





const PaymentComponent = () => {
  const [payments, setPayments] = useState<PaymentRequest[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<Batch | undefined>();

  useEffect(() => {
    console.log('Selected Batch:', selectedBatch);
    if (selectedBatch) {
      fetchPayments();
    }
  }, [selectedBatch]);


  useEffect(() => {
    fetchBatches();
  }, []);

  const handleBatchSelection = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selection = event.target.value;
    console.log('Selection:', selection);
    const batch = batches.find(b => b.id === selection);
    setSelectedBatch(batch);
  };

  const fetchPayments = async () => {
    try {
      const url = `http://localhost:5001/api/payments?batchId=${selectedBatch?.id}`;
      const response = await axios.get(url);
      setPayments(response.data);
    } catch (error) {
      console.error('Failed to fetch payments:', error);
    }
  };

  const fetchBatches = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/batches');
      setBatches([...response.data.filter((batch: Batch) => batch.status !== 'Discarded')]);
    } catch (error) {
      console.error('Failed to fetch batches:', error);
    }
  };

  const onDiscard = async (batchId: string) => {
    console.log('Discard', batchId);

    try {
      const response = await axios.post(`http://localhost:5001/api/discard?batchId=${batchId}`);

      if (response.status === 200) {
        console.log('All collections cleared');
        setPayments([]);
        setBatches(batches.filter(b => b.id !== batchId));
        setSelectedBatch(undefined);
      } else {
        console.error('Error clearing collections:', response.statusText);
      }
    } catch (error) {
      console.error('Error clearing collections:', error);
    }
  };

  const columns = [
    { field: 'employeeDunkinId', headerName: 'Employee Dunkin ID', width: 200 },
    { field: 'employeeName', headerName: 'Employee Name', width: 200 },
    { field: 'payeePlaidId', headerName: 'Payee Plaid ID', width: 200 },
    { field: 'payorDunkinId', headerName: 'Payor Dunkin ID', width: 200 },
    { field: 'payorEIN', headerName: 'Payor EIN', width: 200 },
    { field: 'payorName', headerName: 'Payor Name', width: 200 },
    { field: 'amount', headerName: 'Amount', width: 200 },
    { field: 'status', headerName: 'Status', width: 200 },
    { field: 'message', headerName: 'Message', width: 200 },
  ];

  const rows = payments.map((payment) => ({
    id: payment.paymentRequestId,
    employeeDunkinId: payment.employee.dunkinId,
    employeeName: `${payment.employee.firstName} ${payment.employee.lastName}`,
    payeePlaidId: payment.payee.plaidId,
    payorDunkinId: payment.payor.dunkinId,
    payorEIN: payment.payor.ein,
    payorName: payment.payor.name,
    amount: payment.amount,
    status: payment.status,
    message: payment.message,
  }));

  return (
    <div style={{ height: 400, width: '100%' }}>
      <h2>Payment Review</h2>
      <div className="batch-selection" style={{marginBottom: '10px'}}>
        <select
          onChange={handleBatchSelection}
          style={{width: '25%', maxHeight: '150px', overflowY: 'auto'}}
        >
          <option value="">Select a batch</option>
          {batches.map((batch: Batch) => (
            <option key={batch.id} value={batch.id}>
              {batch.fileName} - {batch.status}
            </option>
          ))}
        </select>
      </div>
      <div className="payment-actions" style={{display: 'flex', justifyContent: 'flex-start', marginBottom: '20px'}}>
        <Button
          variant="contained"
          onClick={() => selectedBatch && onApprove(selectedBatch.id)}
          style={{marginRight: '10px'}}
          disabled={!selectedBatch}
        >
          Approve
        </Button>
        <Button
          variant="contained"
          onClick={() => selectedBatch && onDiscard(selectedBatch.id)}
          disabled={!selectedBatch}
        >
          Discard
        </Button>
      </div>
      <DataGrid
        rows={rows}
        columns={columns}
        checkboxSelection
        pagination
      />
    </div>
  );
};


export default PaymentComponent;