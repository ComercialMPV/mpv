const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
    name: {
      type: String,
      required: true,
      trim: true
    },
  contactPerson: {
    type: String,
    trim: true
  },
  origin: { 
    type: String, 
    enum: ['internal', 'external', 'Referral', 'POS', 'pending-room', 'Partner_Portal'], 
    default: 'internal' 
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  contactPerson: {
    type: String,
    trim: true
  },
  billingAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  shippingAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  taxId: {
    type: String,
    trim: true
  },
  vatNumber: {
    type: String,
    trim: true
  },
  paymentTerms: {
    type: String,
    default: 'Net 30'
  },
  currency: {
    type: String,
    default: 'MT'
  },
  balance: {
    type: Number,
    default: 0 // wallet balance
  },
  // Novos campos de controlo de notificações
  notifiedLowBalance:  { type: Boolean, default: false },   // ≤ 500
  notifiedZeroBalance: { type: Boolean, default: false },   // ≤ 0
  
  lastBalanceNotification: { type: Date, default: null },
  
  notes: {
    type: String
  },
  leadOrigin: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
    createdBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User',
      required: false,
      default: null
    },
    referredBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'ReferralPartner',
      required: false,
      default: null
    },
    referredByPartner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ReferralPartner',
    default: null,
    index: true   // importante para performance
  },
    referralCodeUsed: { 
      type: String,
      trim: true
    },
  isActive: {
    type: Boolean,
    default: true
  },
  isWalkIn: {
    type: Boolean,
    default: false
  },
}, {
  timestamps: true
});

// Index for searching
clientSchema.index({ name: 'text', email: 'text', contactPerson: 'text' });

module.exports = mongoose.model('Client', clientSchema);