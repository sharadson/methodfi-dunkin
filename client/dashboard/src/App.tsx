import React, { useState } from 'react';
import FileUploadComponent from "./components/FileUploadComponent";
import PaymentComponent from './components/PaymentComponent';
import ReportComponent from './components/ReportComponent';

function App() {
  const [activeTab, setActiveTab] = useState('upload');

  const getTabButtonClassName = (tabName: string) => {
    return `tab-button ${activeTab === tabName ? 'tab-button-active' : ''}`;
  };

  return (
    <div className="App">
      <div className="sidebar">
        <button className={getTabButtonClassName('upload')} onClick={() => setActiveTab('upload')}>Upload</button>
        <button className={getTabButtonClassName('payment')} onClick={() => setActiveTab('payment')}>Payments</button>
        <button className={getTabButtonClassName('report')} onClick={() => setActiveTab('report')}>Report</button>
      </div>
      <div className="content">
        {activeTab === 'upload' && <FileUploadComponent/>}
        {activeTab === 'payment' && <PaymentComponent/>}
        {activeTab === 'report' && <ReportComponent/>}
      </div>
    </div>
  );
}

export default App;