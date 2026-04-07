import mongoose, { Schema, Document } from 'mongoose';

export interface IAudit extends Document {
  auditorId: mongoose.Types.ObjectId;
  dateExecution: Date;
  adresse?: string;
  categories: any[];
  correctiveActions?: any[];
  status?: 'draft' | 'in_progress' | 'completed' | 'archived';
  completedAt?: Date;
  synced: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AuditSchema = new Schema<IAudit>(
  {
    auditorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    dateExecution: { type: Date, required: true },
    adresse: { type: String },
    categories: { type: Schema.Types.Mixed, required: true },
    correctiveActions: { type: Schema.Types.Mixed },
    status: { 
      type: String, 
      enum: ['draft', 'in_progress', 'completed', 'archived'],
      default: 'in_progress'
    },
    completedAt: { type: Date },
    synced: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

// Index pour accélérer la liste des audits (tri par date)
AuditSchema.index({ createdAt: -1 });
AuditSchema.index({ auditorId: 1, createdAt: -1 });

export const Audit = mongoose.model<IAudit>('Audit', AuditSchema);

