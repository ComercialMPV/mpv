const mongoose = require('mongoose');

const proposalRecipientSchema = new mongoose.Schema({
  type: { type: String, enum: ['client', 'lead'], required: true },
  id: { type: mongoose.Schema.Types.ObjectId, required: true },
  email: { type: String, required: true },
  name: { type: String },
  sentAt: { type: Date, default: Date.now },
  openedAt: { type: Date },
  bounced: { type: Boolean, default: false },
  bounceReason: { type: String },
  ignored: { type: Boolean, default: false },
});

const proposalAttachmentSchema = new mongoose.Schema({
 filename: { type: String, required: true },          // obrigatório (nome amigável)
  publicUrl: { type: String, required: true },         // obrigatório (link de download)
  gcsPath: { type: String },                           // opcional (interno)
  mimetype: { type: String },                          // opcional
  size: { type: Number },                              // opcional
  uploadedAt: { type: Date, default: Date.now },
});


const proposalSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
  client: { type: mongoose.Schema.Types.ObjectId, ref:'Client', required: true},
  template: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Template',
    description: 'Template visual utilizado para renderizar esta proposta'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  subject: {
    type: String,
    required: true,
  },
  openCount: { type: Number, default: 0 },
  message: {
    type: String,
  },
  items: [{
  description: { type: String },
  quantity: { type: Number },
  unitPrice: { type: Number }
}],
  recipients: [proposalRecipientSchema],
  attachments: [proposalAttachmentSchema],
  status: {
    type: String,
    enum: ['draft', 'sent', 'opened', 'accepted', 'rejected', 'expired'],
    default: 'draft',
  },
  shareToken: { 
    type: String, 
    unique: true, 
    sparse: true 
  },
  viewCount: { 
    type: Number, 
    default: 0 
  },
  sentAt: Date,
  expiresAt: Date,
  shareToken: {
    type: String,
    unique: true,
    sparse: true,
  },
}, {
  timestamps: true,
});
proposalSchema.index({ shareToken: 1 });
proposalSchema.index({ createdBy: 1, sentAt: -1 });
proposalSchema.index({ company: 1, status: 1 });

module.exports = mongoose.model('Proposal', proposalSchema);