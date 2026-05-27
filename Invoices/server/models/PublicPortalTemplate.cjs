// models/PublicPortalTemplate.cjs
const mongoose = require('mongoose');

const publicPortalTemplateSchema = new mongoose.Schema({
 company: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Company',
  required: function() { return !this.isBuiltIn; }   // required only if NOT built-in
},
createdBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User',
  required: function() { return !this.isBuiltIn; }
},
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: { type: String, default: '' },
  htmlContent: {
    type: String,
    required: true
  },
  cssContent: { type: String, default: '' },
  logoOverride: { type: String },
  primaryColor: { type: String, default: '#3b82f6' },
  accentColor: { type: String, default: '#1e40af' },
  checkoutBackground: { type: String, default: '#0f172a' },
  checkoutTextColor: { type: String, default: '#f8fafc' },
  // Support React variant-based templates
  templateType: { 
    type: String, 
    enum: ['html', 'react-custom', 'variant'],   // ← novo valor: react-custom
    default: 'html' 
  },
  reactCode: {
    type: String,
    default: '// Default React component\n',
  },
  reactImportsAndLogic: { type: String, default: '' },
  reactJSXReturn:       { type: String, default: '' },
  baseVariantId: { 
    type: String, 
    default: null 
  },
  variantId: { type: String },
  isDefault: { type: Boolean, default: false },
  isBuiltIn: { type: Boolean, default: false },

}, {
  timestamps: true
});

module.exports = mongoose.model('PublicPortalTemplate', publicPortalTemplateSchema);