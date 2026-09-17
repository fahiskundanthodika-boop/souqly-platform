// Broadcast model - WhatsApp marketing messages sent to customers
const mongoose = require('mongoose');

const BroadcastSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },

  message: { type: String, required: true },
  imageUrl: { type: String }, // optional image to send

  // Who to send it to
  targetAudience: {
    type: String,
    enum: ['all', 'active', 'inactive', 'whatsapp_only', 'birthday'],
    default: 'all'
  },

  // Scheduling
  scheduledAt: { type: Date },
  isRecurring: { type: Boolean, default: false },
  recurringType: { type: String, enum: ['daily', 'weekly', 'monthly'] },

  // Status
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'sending', 'sent', 'cancelled'],
    default: 'draft'
  },

  // Results after sending
  totalRecipients: { type: Number, default: 0 },
  delivered: { type: Number, default: 0 },
  failed: { type: Number, default: 0 },
  ordersGenerated: { type: Number, default: 0 },  // how many orders came from this campaign
  revenueGenerated: { type: Number, default: 0 }, // revenue from this campaign

  sentAt: { type: Date },

}, { timestamps: true });

module.exports = mongoose.model('Broadcast', BroadcastSchema);
