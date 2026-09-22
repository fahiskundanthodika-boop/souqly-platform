const mongoose = require('mongoose');

// Tracks a shop owner's WhatsApp bot conversation with Souqly
const WaOwnerSessionSchema = new mongoose.Schema({
  phone:    { type: String, required: true, unique: true },
  shopId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Shop' },
  step:     { type: String, default: 'start' },
  // steps: start | register_name | register_category | register_email |
  //        register_password | register_phone | logged_in |
  //        add_product_name | add_product_price | add_product_category | add_product_unit
  tempData: { type: mongoose.Schema.Types.Mixed, default: {} },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) }
}, { timestamps: true });

WaOwnerSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('WaOwnerSession', WaOwnerSessionSchema);
