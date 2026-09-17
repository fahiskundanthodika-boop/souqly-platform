// Notification model - Alerts for shop owners (new order, low stock, etc.)
const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },

  type: {
    type: String,
    enum: ['new_order', 'order_cancelled', 'low_stock', 'payment_received', 'rider_assigned', 'general'],
    default: 'general'
  },

  title: { type: String, required: true },
  message: { type: String, required: true },

  isRead: { type: Boolean, default: false },

}, { timestamps: true });

module.exports = mongoose.model('Notification', NotificationSchema);
