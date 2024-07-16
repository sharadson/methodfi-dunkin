import React, { useState } from 'react';
import FileUploadComponent from "./components/FileUploadComponent";
import PaymentComponent from './components/PaymentComponent';
import ReportComponent from './components/ReportComponent';

function App() {
  const [activeTab, setActiveTab] = useState('upload');

  const handleTabChange = (tabName: string) => {
    setActiveTab(tabName);
  };

  return (
    <div className="App">
      <div className="sidebar">
        <button onClick={() => handleTabChange('upload')}>Upload</button>
        <button onClick={() => handleTabChange('payment')}>Payment</button>
        <button onClick={() => handleTabChange('report')}>Report</button>
      </div>
      <div className="content">
        {activeTab === 'upload' && <FileUploadComponent />}
        {activeTab === 'payment' && <PaymentComponent />}
        {activeTab === 'report' && <ReportComponent />}
      </div>
    </div>
  );
}

export default App;