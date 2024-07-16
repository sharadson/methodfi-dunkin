import express from 'express';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import fileUpload from 'express-fileupload';
import xml2js from 'xml2js';
import paymentService from './services/paymentService';
import batchService from './services/batchService';
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

  const uploadedFile = req.files.file as fileUpload.UploadedFile;
  const xmlFileContent = uploadedFile.data.toString('utf8');
  const fileName = uploadedFile.name;

  xml2js.parseString(xmlFileContent, async (err, result) => {
    if (err) return res.status(500).send('Error parsing XML.');

    try {
      const batchId = await batchService.createBatch(fileName);
      const payments = await paymentService.createPaymentRequestsForBatch(result, batchId);

      res.send(batchId);
    } catch (error) {
      res.status(500).send('Error saving to database.');
    }
  });
});


app.get('/api/batches', async (req, res) => {
  try {
    const batches = await batchService.getAllBatches();
    res.json(batches);
  } catch (error) {
    res.status(500).send('Error fetching batches.');
  }
});

app.get('/api/payments', async (req, res) => {
  const { batchId } = req.query;

  if (!batchId) {
    return res.status(400).send('Batch ID is required.');
  }

  try {
    const payments = await paymentService.getPaymentRequestsByBatchId(batchId);
    res.json(payments);
  } catch (error) {
    res.status(500).send('Error fetching payment requests.');
  }
});

app.post('/api/approve', async (req, res) => {
  const { batchId } = req.query;

  if (!batchId) {
    return res.status(400).send('Batch ID is required.');
  }

  try {
    const payments = await paymentService.processPaymentRequestsForBatch(batchId);
    res.send({ message: `Payments from batch ${batchId} have been processed.`, processedPayments: payments });
  } catch (error) {
    res.status(500).send('Error processing payments.');
  }
});

app.post('/api/discard', async (req, res) => {
  const { batchId } = req.query;
  console.log('batchId', req.query);

  if (!batchId) {
    return res.status(400).send('Batch ID is required.');
  }

  try {
    await batchService.discardBatch(batchId);
    await paymentService.discardPaymentRequestsForBatch(batchId);
    res.send({ message: `Payments from batch ${batchId} have been discarded.`});
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