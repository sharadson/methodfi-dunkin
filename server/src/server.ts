import express from 'express';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import fileUpload from 'express-fileupload';
import xml2js from 'xml2js';
import paymentService from './services/paymentService';
import batchService from './services/batchService';
import cors from "cors";
import {BatchStatus} from "./models/Batch";
import ReportService from "./services/reportService";

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
  const { batchId } = req.query; // or req.body, depending on how you send data

  if (!batchId) {
    return res.status(400).send('Batch ID is required.');
  }

  try {
    const batch = await batchService.getBatchById(batchId); // Assuming this method exists
    if (!batch) {
      return res.status(404).send('Batch not found.');
    }

    await batchService.updateBatchStatus(batchId, BatchStatus.Approved);
    res.send({ message: `Batch ${batchId} has been approved.` });
  } catch (error) {
    res.status(500).send('Error approving batch.');
  }
});

app.post('/api/process', async (req, res) => {
  const { batchId } = req.query;

  if (!batchId) {
    return res.status(400).send('Batch ID is required.');
  }

  try {
    await batchService.updateBatchStatus(batchId, BatchStatus.Processing);
    const payments = await paymentService.processPaymentRequestsForBatch(batchId);
    await batchService.updateBatchStatus(batchId, BatchStatus.Processed);
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
    await batchService.updateBatchStatus(batchId, BatchStatus.Discarded);
    await paymentService.discardPaymentRequestsForBatch(batchId);
    res.send({ message: `Payments from batch ${batchId} have been discarded.`});
  } catch (error) {
    res.status(500).send('Error processing payments.');
  }
});

app.get('/api/reports', async (req, res) => {
  const batchId = req.query.batchId as string || '';
  const reportType = req.query.reportType as string || '';
  if (!batchId || !reportType) {
    return res.status(400).send('Batch ID and report type are required.');
  }
  try {
    const report = await ReportService.generateReport(batchId, reportType);
    res.json(report);
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).send('Error generating report.');
  }
});

app.listen(port, () => console.log(`Server running on port ${port}`));