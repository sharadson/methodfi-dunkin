export interface Batch {
  id: string;
  fileName: string;
  status: string;
  uploadedAt: string;
}

export enum BatchStatus {
  Pending = 'Pending',
  Approved = 'Approved',
  Processing = 'Processing',
  Processed = 'Processed',
  Discarded = 'Discarded'

}
