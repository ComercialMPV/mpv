const mongoose = require('mongoose');

const templateSchema = new mongoose.Schema({
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
  description: {
    type: String
  },
  documentTypes: [{
    type: String,
    enum: ['invoice', 'quotation', 'worksheet', 'purchase_order']
  }],
  htmlContent: {
    type: String,
    required: true
  },
  cssContent: {
    type: String,
    default: ''
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  isBuiltIn: {
    type: Boolean,
    default: false
  },
  preview: {
    type: String // Base64 image or URL
  },
  // Visibility / monetization
  isPublic: {
    type: Boolean,
    default: false
  },
  isPaid: {
    type: Boolean,
    default: false
  },
  price: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Tracking de compras: empresas que adquiriram este template
  purchasedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  }]
}, {
  timestamps: true
});

// Ensure only one default template per document type per company
templateSchema.index({ company: 1, isDefault: 1, documentTypes: 1 });

module.exports = mongoose.model('Template', templateSchema);