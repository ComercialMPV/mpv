const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
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
  address: {
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
  notes: {
    type: String
  },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for searching
supplierSchema.index({ name: 'text', email: 'text', contactPerson: 'text' });

module.exports = mongoose.model('Supplier', supplierSchema);