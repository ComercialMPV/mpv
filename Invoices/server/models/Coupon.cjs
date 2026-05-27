const mongoose = require('mongoose');
// Coupon.cjs
const CouponSchema = new mongoose.Schema({
  code: { type: String, unique: true, uppercase: true },
  discountType: { type: String, enum: ['Percentage', 'Fixed'] },
  value: Number,
  active: { type: Boolean, default: true },
  expiryDate: Date
});
module.exports = mongoose.model('Coupon', CouponSchema);