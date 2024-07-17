import * as React from 'react';
import {useEffect, useState} from 'react';
import axios from 'axios';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import {Batch} from "../types/batchTypes";
import {BatchStatus} from "../types/batchTypes";
import {ReportTypes} from "../types/reportTypes";

const columns = {
  totalAmountPerSource: [
    { field: 'dunkinId', headerName: 'Payor Dunkin Id', width: 200 },
    { field: 'source', headerName: 'Account Number', width: 200 },
    { field: 'totalAmount', headerName: 'Total Amount', width: 200 },
  ],
  totalAmountPerBranch: [
    { field: 'branch', headerName: 'Branch', width: 200 },
    { field: 'totalAmount', headerName: 'Total Amount', width: 200 },
  ],
  paymentStatus: [
    { field: 'paymentId', headerName: 'Payment Id', width: 200 },
    { field: 'employeeDunkinId', headerName: 'Employee Dunkin Id', width: 200 },
    { field: 'payorDunkinId', headerName: 'Payor Dunkin Id', width: 200 },
    { field: 'amount', headerName: 'Amount', width: 200 },
    { field: 'status', headerName: 'Status', width: 200 },
    { field: 'createdAt', headerName: 'Created At', width: 200 },
  ],
};



const reportTypes = [
  ReportTypes.TotalAmountPerSource, ReportTypes.TotalAmountPerBranch, ReportTypes.PaymentStatus
];

const getRows = (data: any[], reportType: ReportTypes) => {
  switch (reportType) {
    case ReportTypes.TotalAmountPerSource:
      return data.map((item) => ({
        id: item.dunkinId,
        dunkinId: item.dunkinId,
        source: item.source,
        totalAmount: item.totalAmount,
      }));
    case ReportTypes.TotalAmountPerBranch:
      return data.map((item) => ({
        id: item.branch,
        branch: item.branch,
        totalAmount: item.totalAmount,
      }));
    case ReportTypes.PaymentStatus:
      return data.map((item) => ({
        id: item.paymentRequestId,
        paymentId: item.paymentId,
        employeeDunkinId: item.employeeDunkinId,
        payorDunkinId: item.payorDunkinId,
        status: item.status,
        amount: item.amount,
        createdAt: item.createdAt,
      }));
    default:
      return [];
  }
};

const ReportComponent: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [rowsByReportType, setRowsByReportType] = useState<{ [key: string]: any[] }>({
    [ReportTypes.TotalAmountPerSource]: [],
    [ReportTypes.TotalAmountPerBranch]: [],
    [ReportTypes.PaymentStatus]: [],
  });
  const [selectedBatch, setSelectedBatch] = useState<Batch | undefined>();

  useEffect(() => {
    fetchBatches();
  }, []);

  useEffect(() => {
    if (selectedBatch) {
      fetchReport(reportTypes[activeTab]);
    }
  }, [selectedBatch]);

  const fetchBatches = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/batches');
      setBatches([...response.data.filter((batch: Batch) => batch.status === BatchStatus.Processed)]);
    } catch (error) {
      console.error('Failed to fetch batches:', error);
    }
  };

  const fetchReport = async (reportType: string) => {
    try {
      if (!selectedBatch) return;
      console.log('Fetching report:', reportType);
      const response = await axios.get(`http://localhost:5001/api/reports?batchId=${selectedBatch?.id}&reportType=${reportType}`);
      setRowsByReportType(prevState => ({
        ...prevState,
        [reportType]: getRows(response.data, reportType as ReportTypes)
      }));
    } catch (error) {
      console.error('Error fetching report:', error);
    }
  };

  const handleBatchSelection = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selection = event.target.value;
    const batch = batches.find(b => b.id === selection);
    setSelectedBatch(batch);
    console.log('Selected batch:', batch);
    if (!batch) {
      setRowsByReportType({
        [ReportTypes.TotalAmountPerSource]: [],
        [ReportTypes.TotalAmountPerBranch]: [],
        [ReportTypes.PaymentStatus]: [],
      });
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    fetchReport(reportTypes[newValue]);
  };

  return (
    <div>
      <h2>Reports</h2>
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
      </div>
      <Tabs value={activeTab} onChange={handleTabChange} aria-label="report tabs">
        <Tab label="Total Amount Per Source"/>
        <Tab label="Total Amount Per Branch"/>
        <Tab label="Payment Status"/>
      </Tabs>
      <div style={{height: 750, width: '100%'}}>
        <DataGrid
          rows={rowsByReportType[reportTypes[activeTab]]}
          columns={columns[reportTypes[activeTab] as keyof typeof columns]}
          checkboxSelection
          pagination
          slots={{
            toolbar: GridToolbar,
          }}
        />
      </div>
    </div>
  );
};

export default ReportComponent;