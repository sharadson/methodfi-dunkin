import * as React from 'react';
import ReportComponent from './components/ReportComponent';
import FileUploadComponent1 from './components/FileUploadComponent1';
import PaymentComponent from './components/PaymentComponent';
import FileUploadComponent from "./components/FileUploadComponent";
import ElementComponent from "./components/ElementComponent";

function App() {
  return (
      <div className="App">
          {/*<FileUploadComponent1 onUploadSuccess={handleUploadSuccess} />*/}
          <FileUploadComponent />
          <PaymentComponent payments={[]} onApprove={() => {}} onDiscard={() => {}} />
          <ReportComponent />
          {/*<ElementComponent />*/}
      </div>
  );
}

export default App;