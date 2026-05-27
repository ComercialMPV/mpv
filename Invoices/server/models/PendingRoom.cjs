const mongoose = require('mongoose');

const roomItemSchema = new mongoose.Schema({
  itemId: String,
  name: String,
  price: Number,
  qty: { type: Number, default: 1 },
  type: {
    type: String,
    enum: ['product', 'service', 'bundle']
  }
});

const pendingRoomSchema = new mongoose.Schema({
  ticketCode: {
    type: String,
    unique: true,
    required: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  },
   partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null // Opcional, para vendas que não foram feitas por parceiros
    },
  clientId: mongoose.Schema.Types.ObjectId,
  clientName: { type: String, required: true },
  clientPhone: { type: String, required: false },
  items: [roomItemSchema],
  subtotal: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  notes: String,
  status: {
    type: String,
    enum: ['open', 'paid-full', 'paid-50', 'reserved', 'closed'],
    default: 'open'
  },
  createdAt: { type: Date, default: Date.now },
  closedAt: Date,
  closedBy: mongoose.Schema.Types.ObjectId, // user que fechou
  finalStatus: String // como foi fechado
});

// Gerar ticket code único
pendingRoomSchema.pre('validate', async function(next) {
  if (!this.ticketCode) {
    const count = await this.constructor.countDocuments();
    const date = new Date().getFullYear();
    this.ticketCode = `RDP-${date}-${String(count + 1).padStart(5, '0')}`;
  }
  
  // Recalcular total
  this.subtotal = this.items.reduce((sum, item) => sum + (item.price * item.qty), 0);
  this.total = this.subtotal - (this.discount || 0);
  
  next();
});

module.exports = mongoose.model('PendingRoom', pendingRoomSchema);
