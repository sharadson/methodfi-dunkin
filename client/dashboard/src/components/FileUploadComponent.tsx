import * as React from 'react';
import { useState } from 'react';
import axios from 'axios';
import Button from '@mui/material/Button';
import '../App.css';

enum UploadStatus {
  Uploading = 'Uploading...',
  Success = 'File uploaded successfully',
  Failed = 'File upload failed'
}

const FileUpload: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setSelectedFile(event.target.files[0]);
      setFileName(event.target.files[0].name);
    }
    setUploadStatus('');
    event.target.value = '';
  };

  const onClear = () => {
    setSelectedFile(null);
    setFileName('');
    setUploadStatus('');
  }
  const handleFileUpload = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('fileName', fileName);

    try {
      setUploadStatus(UploadStatus.Uploading);
      await axios.post('http://localhost:5001/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setUploadStatus(UploadStatus.Success);
    } catch (error) {
      setUploadStatus(UploadStatus.Failed);
      console.error('Error uploading file:', error);
    }
  };

  return (
    <div>
      <h2>File Upload</h2>
      <label htmlFor="fileUpload" className="fileInputLabel">
        SELECT FILE
      </label>
      <input id="fileUpload" type="file" onChange={handleFileChange} className="fileInput"/>
      <Button
        variant="contained"
        onClick={handleFileUpload}
        style={{ marginLeft: '10px' }}
        disabled={!selectedFile || (uploadStatus === UploadStatus.Success)}
      >
        Upload
      </Button>
      <Button
        variant="contained"
        onClick={onClear}
        style={{ marginLeft: '10px' }}
        disabled={!selectedFile}
      >
        Clear
      </Button>
      <p>Selected file: {fileName}</p>
      <p>Upload status: {uploadStatus}</p>
    </div>
  );
};

export default FileUpload;