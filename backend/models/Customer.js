// Customer model - People who order from a shop
const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },

  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, default: '' },
  address: { type: String, default: '' },

  // Order History
  totalOrders: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  loyaltyPoints: { type: Number, default: 0 },
  lastOrderAt: { type: Date },

  // How did they find the shop?
  channel: { type: String, enum: ['whatsapp', 'website', 'pos', 'manual'], default: 'website' },

  // OTP login
  otp: { type: String },
  otpExpiry: { type: Date },

}, { timestamps: true });

// One customer per phone number per shop
CustomerSchema.index({ shopId: 1, phone: 1 }, { unique: true });

module.exports = mongoose.model('Customer', CustomerSchema);
