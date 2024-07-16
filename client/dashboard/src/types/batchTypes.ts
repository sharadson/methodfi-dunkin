export interface Batch {
  id: string;
  fileName: string;
  status: string;
  uploadedAt: string;
}

export enum BatchStatus {
  Unapproved = 'Unapproved',
  Approved = 'Approved',
  Processing = 'Processing',
  Processed = 'Processed',
  Discarded = 'Discarded'

}
