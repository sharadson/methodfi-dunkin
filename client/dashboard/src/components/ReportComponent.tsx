import * as React from 'react';
import { useState } from 'react';

import axios from 'axios';
import Button from '@mui/material/Button';

const ReportComponent: React.FC = () => {
  const [reports, setReports] = useState<any[]>([]);

  const fetchReport = async (reportType: string) => {
    try {
      const response = await axios.get(`/api/reports/${reportType}`);
      setReports(response.data);
    } catch (error) {
      console.error('Error fetching report:', error);
    }
  };

  return (
    <div>
      <h2>Reports</h2>
      <Button variant="contained" onClick={() => fetchReport('totalAmountPerSource')}>Total Amount Per Source</Button>
      <Button variant="contained" onClick={() => fetchReport('totalAmountPerBranch')}>Total Amount Per Branch</Button>
      <Button variant="contained" onClick={() => fetchReport('paymentStatus')}>Payment Status</Button>
      <ul>
        {reports.map((report, index) => (
          <li key={index}>{report}</li>
        ))}
      </ul>
    </div>
  );
};

export default ReportComponent;