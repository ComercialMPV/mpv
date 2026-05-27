const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  itemType: {
    type: String,
    enum: ['Service', 'Product', 'Bundle'],
    required: true
  },
  item: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'items.itemType',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  priceAtTime: {          // ← Snapshot do preço no momento da requisição (mais seguro)
    type: Number,
    required: true
  },

  // Campos específicos para Bundles
  bundlePriceType: {      // novo: ajuda o frontend a saber qual campo usar
    type: String,
    enum: ['price', 'billingPricePerCycle'],
    default: 'price'
  },

  madeToOrder: { type: Boolean, default: false },
  orderPrice: { type: Number, default: 0 },
  deliveryDays: { type: Number, default: 0 }
});

const requisitionSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  number: { type: String, required: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  origin: { type: String, enum: ['internal', 'external'], default: 'external' },
  items: [itemSchema],
  requestedInstallments: { type: Number, default: 1 },
  requestIntent: {
    type: String,
    enum: ['quotation', 'invoice', 'unspecified'],
    default: 'unspecified'
  },
  deliveryDate: { type: Date },
  notes: { type: String },
  baseTotal: { type: Number, default: 0 },
  finalTotal: { type: Number, default: 0 },
  status: {
    type: String,
    enum: [
      'pending', 'approved', 'rejected', 
      'quotation_requested', 'invoice_requested',
      'converted_to_quotation', 'converted_to_invoice'
    ],
    default: 'pending'
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });


// Lógica de Cálculo Dinâmica no Pre-save
requisitionSchema.pre('save', async function(next) {
  if (!this.isModified('items') && !this.isModified('requestedInstallments')) return next();

  const ServiceModel = mongoose.model('Service');
  const ProductModel = mongoose.model('Product');
  const BundleModel = mongoose.model('Bundle');

  let baseTotal = 0;
  let minAllowedInstallments = Infinity;
  let maxPenaltyRate = 0;
  let hasServices = false;

  for (const item of this.items) {
    let doc;
    
    // Busca o documento baseado no tipo dinâmico
    if (item.itemType === 'Service') {
      doc = await ServiceModel.findById(item.item);
      hasServices = true; // Só serviços geralmente regram parcelamento neste modelo
      if (doc) {
        minAllowedInstallments = Math.min(minAllowedInstallments, doc.allowedInstallments || 1);
        maxPenaltyRate = Math.max(maxPenaltyRate, doc.penaltyPercentagePerInstallment || 0);
      }
    } else if (item.itemType === 'Product') {
      doc = await ProductModel.findById(item.item);
    } else if (item.itemType === 'Bundle') {
      doc = await BundleModel.findById(item.item);
    }

    if (!doc) return next(new Error(`Item ${item.item} do tipo ${item.itemType} não encontrado.`));

    // Define o preço no momento (Snapshot)
    // Produtos e Bundles usam .price, Serviços usam .basePrice
    item.priceAtTime = doc.basePrice !== undefined ? doc.basePrice : doc.price;
    
    baseTotal += item.priceAtTime * item.quantity;
  }

  this.baseTotal = baseTotal;

  // Aplica multa de parcelamento apenas se houver serviços e exceder o limite
  if (hasServices && this.requestedInstallments > minAllowedInstallments && minAllowedInstallments !== Infinity) {
    const extra = this.requestedInstallments - minAllowedInstallments;
    this.finalTotal = baseTotal + (baseTotal * (extra * (maxPenaltyRate / 100)));
  } else {
    this.finalTotal = baseTotal;
  }

  next();
  
});


module.exports = mongoose.model('Requisition', requisitionSchema);