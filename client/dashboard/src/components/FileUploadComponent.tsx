import * as React from 'react';
import { useState } from 'react';
import axios from 'axios';
import Button from '@mui/material/Button';
import '../App.css';

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
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await axios.post('http://localhost:5001/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setUploadStatus('File uploaded successfully');
      console.log(response.data);
    } catch (error) {
      setUploadStatus('File upload failed');
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
        disabled={!selectedFile}
      >
        Upload
      </Button>
      <p>{uploadStatus}</p>
      <p>Selected file: {fileName}</p>
    </div>
  );
};

export default FileUpload;