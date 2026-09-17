// Review model - customer ratings for orders
const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },

  customerName: { type: String, required: true },
  customerPhone: { type: String, required: true },

  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, default: '', maxlength: 500 },

  isVisible: { type: Boolean, default: true }, // owner can hide a review

}, { timestamps: true });

// One review per order
ReviewSchema.index({ orderId: 1 }, { unique: true });

module.exports = mongoose.model('Review', ReviewSchema);
