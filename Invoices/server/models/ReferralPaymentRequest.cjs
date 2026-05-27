// models/ReferralPaymentRequest.cjs
const mongoose = require('mongoose');

const ReferralPaymentRequestSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  referralPartner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ReferralPartner',
    required: true
  },
  requestedAmount: {
    type: Number,
    required: true,
    min: 1
  },
  paymentMethod: {
    type: String,
    enum: ['mpesa', 'emola', 'mkesh', 'bank'],
    required: true
  },
  // Dados bancários / carteira móvel
  phoneNumber: {
    type: String,
    trim: true
  },
  nibOrIban: {
    type: String,
    trim: true
  },
  accountHolder: {
    type: String,
    trim: true
  },
  bankName: {
    type: String,
    trim: true
  },

  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'paid'],
    default: 'pending'
  },

  notes: String,
  rejectionReason: String,

  requestedAt: {
    type: Date,
    default: Date.now
  },
  processedAt: Date,
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Índices para performance
ReferralPaymentRequestSchema.index({ referralPartner: 1, status: 1 });
ReferralPaymentRequestSchema.index({ company: 1, requestedAt: -1 });

module.exports = mongoose.models.ReferralPaymentRequest || 
                 mongoose.model('ReferralPaymentRequest', ReferralPaymentRequestSchema);