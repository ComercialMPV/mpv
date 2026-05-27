const mongoose = require('mongoose');

const ReferralPartnerSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  birthYear: {
    type: Number,
    required: true,
    min: 1900,
    max: new Date().getFullYear()
  },
  referralCode: {
    type: String,
    unique: true,
    required: true
  },
  totalReferred: { type: Number, default: 0 },
  activeReferred: { type: Number, default: 0 },
  totalEarned: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

// Gerar referralCode único antes de salvar
ReferralPartnerSchema.pre('save', async function(next) {
  if (!this.referralCode) {
    this.referralCode = 'REF-' + Math.random().toString(36).substring(2, 10).toUpperCase();
  }
  next();
});

module.exports = mongoose.models.ReferralPartner || mongoose.model('ReferralPartner', ReferralPartnerSchema);