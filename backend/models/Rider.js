// Rider model - Delivery staff for each shop
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const RiderSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },

  name: { type: String, required: true },
  phone: { type: String, required: true },

  // 4-digit PIN for rider app login (hashed for security)
  pin: { type: String, required: true, select: false },

  vehicleType: {
    type: String,
    enum: ['bike', 'bicycle', 'auto', 'car'],
    default: 'bike'
  },

  isOnline: { type: Boolean, default: false },   // is rider available right now?
  isApproved: { type: Boolean, default: true },  // shop owner can deactivate

  fcmToken: { type: String }, // Firebase token for push notifications

  activeOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' }, // current delivery

  // Earnings & Stats
  totalDeliveries: { type: Number, default: 0 },
  todayDeliveries: { type: Number, default: 0 },
  totalEarnings: { type: Number, default: 0 },
  todayEarnings: { type: Number, default: 0 },

}, { timestamps: true });

// Hash PIN before saving
RiderSchema.pre('save', async function (next) {
  if (this.isModified('pin')) {
    this.pin = await bcrypt.hash(this.pin, 10);
  }
  next();
});

// Check if entered PIN matches stored hash
RiderSchema.methods.matchPin = async function (enteredPin) {
  return await bcrypt.compare(enteredPin, this.pin);
};

module.exports = mongoose.model('Rider', RiderSchema);
