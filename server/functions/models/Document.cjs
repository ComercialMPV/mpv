const mongoose = require('mongoose');

const lineItemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0 },
  unitPrice: { type: Number, required: true, min: 0 },
  taxRate: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },

  // === CAMPOS CORRIGIDOS E AMPLIADOS ===
  itemType: { 
    type: String, 
    enum: ['Product', 'Service', 'Bundle', 'Combo', 'Subscription'],   // ← Adicionado 'Bundle'
    default: 'Service' 
  },
  itemId: { 
    type: mongoose.Schema.Types.ObjectId, 
    refPath: 'lineItems.itemType',   // refPath dinâmico (opcional, mas útil)
    default: null 
  }
});

const documentSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
 requisition: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Requisition',
  default: null,           // ← important
  required: false          // explicit (though default null already makes it optional)
},
convertedTo: [{
  type: { 
    type: String, 
    enum: ['invoice', 'quotation', 'worksheet', 'purchase_order', 'sale', 'receipt'],
    required: true 
  },
  documentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true 
  },
  documentModel: { 
    type: String, 
    enum: ['Document', 'Sale'], 
    default: 'Document' 
  },
  convertedAt: { 
    type: Date, 
    default: Date.now 
  },
  convertedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }
}],

  type: {
    type: String,
    required: true,
    enum: ['invoice', 'quotation', 'worksheet', 'purchase_order']
  },
  number: {
    type: String,
    required: true
  },
  client: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Client',
  required: false,     // ← important
  default: null
},
supplier: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Supplier',
  required: false,
  default: null
},
  status: {
    type: String,
    required: true,
    enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled', 'approved', 'pending', 'converted'],
    default: 'draft'
  },
  issueDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  dueDate: {
    type: Date
  },
  validUntil: {
    type: Date // For quotations
  },
  currency: {
    type: String,
    required: true,
   default: 'MZN'
  },
  paymentTerms: {
    type: String,
    default: 'Net 30'
  },
  lineItems: [lineItemSchema],
  subtotal: {
    type: Number,
    required: true,
    default: 0
  },
  taxAmount: {
    type: Number,
    required: true,
    default: 0
  },
  discountAmount: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    required: true,
    default: 0
  },
  notes: {
    type: String
  },
  terms: {
    type: String
  },
  template: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Template'
  },
  pdfPath: {
    type: String
  },
  shareToken: {
    type: String,
    unique: true,
    sparse: true
  },
  shareExpiresAt: {
    type: Date
  },
   origin:{ 
    type: String, 
    enum: ['internal', 'external', 'partner_portal'],
    default: 'internal'
  },
  auditTrail: [{
    action: {
      type: String,
      required: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    details: {
      type: String
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for searching and filtering
documentSchema.index({ 
  number: 'text', 
  'client.name': 'text',
  'supplier.name': 'text',
  notes: 'text' 
});

documentSchema.index({ company: 1, type: 1, status: 1 });
documentSchema.index({ company: 1, createdAt: -1 });
documentSchema.index({ shareToken: 1 });

// Calculate totals before saving
documentSchema.pre('save', function(next) {
  let subtotal = 0;
  let taxAmount = 0;
  let discountAmount = 0;

  this.lineItems.forEach(item => {
    const lineTotal = item.quantity * item.unitPrice;
    const lineDiscount = (lineTotal * item.discount) / 100;
    const lineSubtotal = lineTotal - lineDiscount;
    const lineTax = (lineSubtotal * item.taxRate) / 100;
    
    subtotal += lineSubtotal;
    taxAmount += lineTax;
    discountAmount += lineDiscount;
  });


  this.subtotal = Math.round(subtotal * 100) / 100;
  this.taxAmount = Math.round(taxAmount * 100) / 100;
  this.discountAmount = Math.round(discountAmount * 100) / 100;
  this.total = Math.round((subtotal + taxAmount) * 100) / 100;
  
  next();
});

module.exports = mongoose.model('Document', documentSchema);