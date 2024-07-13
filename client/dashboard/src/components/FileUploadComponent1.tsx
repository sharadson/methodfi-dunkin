import * as React from 'react';
import { useState } from 'react';

import axios from 'axios';
import { useDropzone } from 'react-dropzone';
import Button from '@mui/material/Button';

interface FileUploadProps {
  onUploadSuccess: (data: any) => void;
}

const FileUploadComponent1: React.FC<FileUploadProps> = ({ onUploadSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const { getRootProps, getInputProps } = useDropzone({
    onDrop: acceptedFiles => setFile(acceptedFiles[0])
  });

  const handleUpload = async () => {
    const formData = new FormData();
    if (file) {
      formData.append('file', file);
      try {
        const response = await axios.post('/api/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        onUploadSuccess(response.data);
      } catch (error) {
        console.error('Error uploading file:', error);
      }
    }
  };

  return (

    <div {...getRootProps()}>
      <input {...getInputProps()} />
      <h2>File Upload</h2>
      <p>Drag & drop a file here, or click to select a file</p>
      <Button variant="contained" onClick={handleUpload}>Upload</Button>
    </div>
  );
};

export default FileUploadComponent1;