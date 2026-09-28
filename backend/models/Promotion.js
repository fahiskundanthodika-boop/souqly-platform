const mongoose = require('mongoose');

const PromotionSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },

  name:       { type: String, required: true, trim: true },
  bannerText: { type: String, default: '' },

  startDate: { type: Date, required: true },
  endDate:   { type: Date, required: true },
  autoExpire: { type: Boolean, default: true },

  status: { type: String, enum: ['active', 'scheduled', 'paused', 'ended'], default: 'scheduled' },

  target: {
    type: { type: String, enum: ['all', 'category', 'products'], required: true },
    category: { type: String, default: '' },
    productIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  },

  discount: {
    type:  { type: String, enum: ['percent', 'flat', 'bogo'], required: true },
    value: { type: Number, default: 0 },   // % or ₹ amount
    buyQty: { type: Number, default: 2 },  // BOGO: buy X
    getQty: { type: Number, default: 1 },  // BOGO: get Y free
  },

}, { timestamps: true });

// Auto-compute status based on dates
PromotionSchema.methods.computeStatus = function () {
  const now = new Date();
  if (this.status === 'paused') return 'paused';
  if (this.autoExpire && now > this.endDate) return 'ended';
  if (now < this.startDate) return 'scheduled';
  return 'active';
};

module.exports = mongoose.model('Promotion', PromotionSchema);
