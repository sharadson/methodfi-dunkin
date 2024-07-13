import * as React from 'react';
import ReportComponent from './components/ReportComponent';
import FileUploadComponent1 from './components/FileUploadComponent1';
import PaymentReviewComponent from './components/PaymentReviewComponent';
import FileUploadComponent from "./components/FileUploadComponent";

function App() {
  const handleUploadSuccess = (data: any) => {
    console.log('File uploaded successfully:', data);
  };

  return (
      <div className="App">
          {/*<FileUploadComponent1 onUploadSuccess={handleUploadSuccess} />*/}
          <FileUploadComponent />
          <PaymentReviewComponent payments={[]} onApprove={() => {}} onDiscard={() => {}} />
          <ReportComponent />
      </div>
  );
}

export default App;