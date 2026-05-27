const mongoose = require('mongoose');

const cashClosureExpenseSchema = new mongoose.Schema({
  cashClosure: { type: mongoose.Schema.Types.ObjectId, ref: 'CashClosure', required: true },
  description: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 },
  category: { type: String, enum: ['emergency', 'supplies', 'maintenance', 'other'], default: 'other' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

module.exports = mongoose.model('CashClosureExpense', cashClosureExpenseSchema);
