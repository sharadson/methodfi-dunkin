// IndividualEntity.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IIndividualEntity extends Document {
  entityId: string;
  dunkinId: string;
  dunkinBranch: string;
}

const IndividualEntitySchema: Schema = new Schema({
  entityId: { type: String, required: true },
  dunkinId: { type: String, required: true },
  dunkinBranch: { type: String, required: true }, // Adding redundancy to the schema for the reporting purposes
});

export const IndividualEntity = mongoose.model<IIndividualEntity>('IndividualEntity', IndividualEntitySchema);