const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
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
  website: {
    type: String,
    trim: true
  },
  logo: {
    type: String // URL or path to logo file
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  plan: {
  type: String,           // guarda o planId (ex: "professional")
  default: 'basic'
},

subscription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
    default: null
  },

  // ← NOVOS CAMPOS
  variantPurchased: { type: Boolean, default: false },
  variantPricePaid: { type: Number, default: 0 },
  variantPurchasedAt: { type: Date },
  variantTransactionId: { type: String },

  referralProgramEnabled: {
    type: Boolean,
    default: false,
    description: "Se a empresa permite que parceiros externos recomendem clientes"
  },

  referralCommissionRate: {
    type: Number,
    default: 10,
    min: 0,
    max: 50,
    description: "Percentagem de comissão dada ao parceiro de recomendação (%)"
  },

  referralCommissionPeriod: {
    type: String,
    enum: ['lifetime', '12months', '6months', '3months', '1month'],
    default: 'lifetime',
    description: "Período durante o qual o parceiro recebe comissão recorrente"
  },
publicPortalEnabled: Boolean,
  publicPortalTemplate: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Template' 
  },
  publicPortalSlug: { 
    type: String, 
    sparse: true 
  },
bankAccounts: [{
  nibOrIban:        { type: String, trim: true },
  accountNumber:    { type: String, trim: true },
  accountHolder:    { type: String, trim: true },
  bankName:         { type: String, trim: true },
  isPrimary:        { type: Boolean, default: false },     // opcional: conta principal
  createdAt:        { type: Date, default: Date.now }
}],
debitoMerchantId: { type: String, trim: true, default: '' },
debitoPat: { type: String, trim: true, default: '' },
debitoWebhookSecret: { type: String, trim: true, default: '' },
mobileWallets: {
  mpesa: { type: String, trim: true },
  emola: { type: String, trim: true },
  mkesh: { type: String, trim: true },
  visa:  { type: String, trim: true },
},
// Add to companySchema
publicPortal: {
  enabled: { type: Boolean, default: false },
  slug: { 
    type: String, 
    sparse: true,
    trim: true,
    lowercase: true,
    match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/
  },
   subdomainPrefix: {           // ← NOVO CAMPO
    type: String,
    sparse: true,
    trim: true,
    lowercase: true,
    match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/
  },
  customDomain: { type: String, sparse: true },
  variant: { 
    type: String, 
    default: 'default'
  },
  publishedAt: { type: Date },
  publishedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }
},
createdBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User',
  required: false,   // superadmin pode criar sem ser "dono"
  index: true
},

  // Controls which menu items are visible to each role
  menuVisibility: {
    type: Map,
    of: [String],
    default: {}
  },

  taxId: {
    type: String,
    trim: true
  },
  vatNumber: {
    type: String,
    trim: true
  },
  currency: {
    type: String,
    default: 'MZN',
    enum: ['MZN', 'MT', 'EUR', 'USD', 'CAD', 'JPY', 'CHF', 'CNY', 'GBP', 'AUD', 'ZAR']
  },
  taxRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  paymentTerms: {
    type: String,
    default: 'Net 30'
  },
  invoiceNumberPrefix: {
    type: String,
    default: 'INV-',
    trim: true
  },
  quotationNumberPrefix: {
    type: String,
    default: 'QUO-',
    trim: true
  },
  worksheetNumberPrefix: {
    type: String,
    default: 'WS-',
    trim: true
  },
  purchaseOrderNumberPrefix: {
    type: String,
    default: 'PO-',
    trim: true
  },
  nextInvoiceNumber: {
    type: Number,
    default: 1
  },
  nextQuotationNumber: {
    type: Number,
    default: 1
  },
  nextWorksheetNumber: {
    type: Number,
    default: 1
  },
  nextPurchaseOrderNumber: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true
});

companySchema.index({ "publicPortal.slug": 1 }, { unique: true, sparse: true });
companySchema.index({ referralProgramEnabled: 1 });
module.exports = mongoose.model('Company', companySchema);