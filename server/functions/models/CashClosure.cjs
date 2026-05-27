const mongoose = require('mongoose');

const cashClosureSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // date for which the closure applies (day boundary)
  date: { type: Date, required: true },
  salesCount: { type: Number, default: 0 },
  totalSalesAmount: { type: Number, default: 0 },
  totalAmountPaid: { type: Number, default: 0 },

  // fields for opening the register
  initialFloat: { type: Number },
  openRequestedAt: { type: Date },
  openStatus: { type: String, enum: ['pending','approved','denied'], default: 'pending' },

  // optional counted cash by the cashier
  countedTotal: { type: Number },
  notes: { type: String },
  status: { type: String, enum: ['draft','submitted','confirmed'], default: 'submitted' },
  confirmedAt: { type: Date },
  confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('CashClosure', cashClosureSchema);
