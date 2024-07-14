import express from 'express';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import fileUpload from 'express-fileupload';
import xml2js from 'xml2js';
import paymentService from './services/paymentService';
import cors from "cors";

const app = express();
const port = process.env.PORT || 5001;

app.use(bodyParser.json());
app.use(fileUpload());
app.use(cors());

mongoose.connect('mongodb://localhost:27017/dunkin');

app.post('/api/upload', async (req, res) => {
  if (!req.files || !req.files.file) {
    return res.status(400).send('No files were uploaded.');
  }

  const xmlFile = (req.files.file as fileUpload.UploadedFile).data.toString('utf8');

  xml2js.parseString(xmlFile, async (err, result) => {
    if (err) return res.status(500).send('Error parsing XML.');

    try {
      const payments = await paymentService.createPaymentRequestsFromXML(result);
      res.send(payments);
    } catch (error) {
      res.status(500).send('Error saving to database.');
    }
  });
});

app.post('/api/approve', async (req, res) => {
  try {
    const payments = await paymentService.processPaymentRequests();
    res.send(payments);
  } catch (error) {
    res.status(500).send('Error processing payments.');
  }
});

app.post('/api/discard', async (req, res) => {
  try {
    const payments = await paymentService.discardPaymentRequests();
    res.send(payments);
  } catch (error) {
    res.status(500).send('Error processing payments.');
  }
});

app.get('/api/reports/:type', async (req, res) => {
  const reportType = req.params.type;
  try {
    const report = await paymentService.generateReport(reportType);
    res.send(report);
  } catch (error) {
    res.status(500).send('Error generating report.');
  }
});

app.listen(port, () => console.log(`Server running on port ${port}`));