const mongoose = require('mongoose');

const ReferralCommissionSchema = new mongoose.Schema({
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
  referredClient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  sale: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sale',
    required: true
  },
  commissionAmount: {
    type: Number,
    required: true,
    min: 0
  },
  commissionRate: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'paid'],
    default: 'pending'
  },
  paidAt: Date,
  notes: String
}, {
  timestamps: true
});

// Índices para performance
ReferralCommissionSchema.index({ referralPartner: 1, status: 1 });
ReferralCommissionSchema.index({ referredClient: 1, sale: 1 });
ReferralCommissionSchema.index({ company: 1, createdAt: -1 });

module.exports = mongoose.models.ReferralCommission || 
                 mongoose.model('ReferralCommission', ReferralCommissionSchema);