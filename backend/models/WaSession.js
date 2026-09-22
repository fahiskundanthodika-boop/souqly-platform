const mongoose = require('mongoose');

// Tracks an ongoing WhatsApp bot conversation per customer phone number
const WaSessionSchema = new mongoose.Schema({
  phone:        { type: String, required: true, unique: true },
  shopId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Shop' },
  shopSlug:     String,
  shopName:     String,
  shopWa:       String,
  step:         { type: String, default: 'start' },
  // steps: start | menu | browsing | cart | get_name | get_address | confirm | done
  cart:         [{ productId: String, name: String, price: Number, qty: Number }],
  products:     mongoose.Schema.Types.Mixed, // cached product list for session
  customerName: String,
  lastOrderId:  String, // for repeat orders
  expiresAt:    { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) }
}, { timestamps: true });

WaSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('WaSession', WaSessionSchema);
