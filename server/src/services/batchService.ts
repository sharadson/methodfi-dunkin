import {Batch} from "../models/Batch";
import {BatchStatus} from "../models/Batch";
import {v4 as uuid} from "uuid";

class BatchService {
  async getAllBatches() {
    try {
      return await Batch.find();
    } catch (error) {
      console.error("Error fetching batches:", error);
      throw error;
    }
  }

  async createBatch(fileName: string) {
    const batch = new Batch({id: uuid(), fileName: fileName, status: BatchStatus.Pending, uploadedAt: new Date()});
    await batch.save();
    return batch.id;
  }

  async getBatchById(batchId: any) {
    try {
      return await Batch.findOne({id: batchId});
    } catch (error) {
      console.error('Error fetching batch:', error);
      throw error;
    }
  }

  async updateBatchStatus(batchId: any, status: BatchStatus) {
    try {
      await Batch.findOneAndUpdate({id: batchId}, {status: status});
    } catch (error) {
      console.error('Error updating batch status:', error);
      throw error;
    }
  }
}

const batchService = new BatchService();
export default batchService;