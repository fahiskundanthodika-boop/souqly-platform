// Subscription model - Tracks each shop's billing/subscription
const mongoose = require('mongoose');

const SubscriptionSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },

  plan: { type: String, enum: ['free', 'starter', 'growth', 'business'], required: true },
  status: { type: String, enum: ['active', 'grace', 'suspended'], default: 'active' },

  amount: { type: Number },
  currency: { type: String, enum: ['INR', 'USD'], default: 'INR' },

  // Which payment gateway was used?
  gateway: { type: String, enum: ['phonepe', 'stripe'] },
  gatewaySubId: { type: String }, // subscription ID from PhonePe or Stripe

  nextBillingDate: { type: Date },
  lastPaymentDate: { type: Date },

}, { timestamps: true });

module.exports = mongoose.model('Subscription', SubscriptionSchema);
