import { DataGrid } from '@mui/x-data-grid';
import * as React from 'react';
import { useEffect, useState } from 'react';
import axios from 'axios';
import Button from '@mui/material/Button';
import { PaymentRequest } from '../types/paymentTypes';
import { Batch, BatchStatus } from '../types/batchTypes';


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
      setBatches([...response.data.filter((batch: Batch) => batch.status !== BatchStatus.Discarded)]);
    } catch (error) {
      console.error('Failed to fetch batches:', error);
    }
  };

  const onDiscard = async () => {
    if (!selectedBatch) {
      return;
    }
    console.log('Discard', selectedBatch.id);
    try {
      const response = await axios.post(`http://localhost:5001/api/discard?batchId=${selectedBatch.id}`);

      if (response.status === 200) {
        console.log('All collections cleared');
        setPayments([]);
        setBatches(batches.filter(b => b.id !== selectedBatch.id));
        setSelectedBatch(undefined);
      } else {
        console.error('Error clearing collections:', response.statusText);
      }
    } catch (error) {
      console.error('Error clearing collections:', error);
    }
  };

  const onProcess = async () => {
    console.log('Process');
    if (!selectedBatch) {
      return;
    }
    try {
      selectedBatch.status = BatchStatus.Processing;
      setBatches(batches.map(b => b.id === selectedBatch.id ? {...b, status: BatchStatus.Processing} : b));
      const response = await axios.post(`http://localhost:5001/api/process?batchId=${selectedBatch.id}`);

      if (response.status === 200) {
        selectedBatch.status = BatchStatus.Processed;
        setBatches(batches.map(b => b.id === selectedBatch.id ? {...b, status: BatchStatus.Processed} : b));
        onRefresh();
        console.log('All collections Processed');
      } else {
        console.error('Error processing collections:', response.statusText);
      }
    } catch (error) {
      console.error('Error processing collections:', error);
    }
  };

  const onApprove = async () => {
    console.log('Approve');
    if (selectedBatch) {
      try {
        const response = await axios.post(`http://localhost:5001/api/approve?batchId=${selectedBatch.id}`);

        if (response.status === 200) {
          console.log('Batch approved');
          selectedBatch.status = BatchStatus.Approved;
          setBatches(batches.map(b => b.id === selectedBatch.id ? {...b, status: BatchStatus.Approved} : b));
        } else {
          console.error('Error approving batch:', response.statusText);
        }
      } catch (error) {
        console.error('Error approving batch:', error)
      }
    }
  }

    const onRefresh = async () => {
      await fetchBatches();
      if (selectedBatch) {
        await fetchPayments();
      }
    };

    const columns = [
      {field: 'employeeDunkinId', headerName: 'Employee Dunkin ID', width: 200},
      {field: 'employeeName', headerName: 'Employee Name', width: 200},
      {field: 'payeePlaidId', headerName: 'Payee Plaid ID', width: 200},
      {field: 'payorDunkinId', headerName: 'Payor Dunkin ID', width: 200},
      {field: 'payorEIN', headerName: 'Payor EIN', width: 200},
      {field: 'payorName', headerName: 'Payor Name', width: 200},
      {field: 'amount', headerName: 'Amount', width: 200},
      {field: 'status', headerName: 'Status', width: 200},
      {field: 'message', headerName: 'Message', width: 200},
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
      <div style={{height: 400, width: '100%'}}>
        <h2>Payments</h2>
        <div className="batch-selection" style={{display: 'flex', alignItems: 'center', marginBottom: '10px'}}>
          <select
            onChange={handleBatchSelection}
            value={selectedBatch?.id || ''}
            style={{width: '25%', height: '35px', maxHeight: '150px', overflowY: 'auto', marginRight: '10px'}}
          >
            <option value="">Select a batch</option>
            {batches.map((batch: Batch) => (
              <option key={batch.id} value={batch.id}>
                {batch.fileName} - {batch.status}
              </option>
            ))}
          </select>
          <Button
            variant="contained"
            onClick={onProcess}
            style={{marginRight: '10px'}}
            disabled={!selectedBatch || selectedBatch.status !== BatchStatus.Approved}
          >
            Process
          </Button>
          <Button
            variant="contained"
            onClick={onRefresh}
            disabled={!selectedBatch || selectedBatch.status === BatchStatus.Processed}
          >
            Refresh
          </Button>
        </div>
        <div className="payment-actions" style={{display: 'flex', justifyContent: 'flex-start', marginBottom: '20px'}}>
          <Button
            variant="contained"
            onClick={() => selectedBatch && onApprove()}
            style={{marginRight: '10px'}}
            disabled={!selectedBatch || selectedBatch.status !== BatchStatus.Unapproved}
          >
            Approve
          </Button>
          <Button
            variant="contained"
            onClick={() => selectedBatch && onDiscard()}
            disabled={!selectedBatch || selectedBatch.status !== BatchStatus.Unapproved}
          >
            Discard
          </Button>
        </div>
        <div style={{ height: '750px', width: '100%' }}>
          <DataGrid
            rows={rows}
            columns={columns}
            checkboxSelection
            pagination
          />
        </div>
      </div>
    );
  };

export default PaymentComponent;