// Coupon model - discount codes for shop customers
const mongoose = require('mongoose');

const CouponSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },

  code: { type: String, required: true, uppercase: true, trim: true },

  type: { type: String, enum: ['percent', 'flat'], required: true }, // percent off or flat amount off
  value: { type: Number, required: true }, // e.g. 10 = 10% or ₹10

  minOrderAmount: { type: Number, default: 0 }, // min order to use coupon
  maxDiscount: { type: Number, default: 0 }, // max discount cap (for percent type, 0 = no cap)

  usageLimit: { type: Number, default: 0 }, // 0 = unlimited
  usedCount: { type: Number, default: 0 },

  isActive: { type: Boolean, default: true },

  expiresAt: { type: Date }, // null = no expiry

}, { timestamps: true });

// One code per shop
CouponSchema.index({ shopId: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('Coupon', CouponSchema);
