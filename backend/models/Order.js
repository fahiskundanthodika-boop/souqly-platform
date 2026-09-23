// Order model - Every customer order placed in any shop
const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },

  // Auto-generated order number like #1001, #1002...
  orderId: { type: Number },

  // Customer Info
  customerName: { type: String, required: true },
  customerPhone: { type: String, required: true },
  customerAddress: { type: String },
  customerLocation: {
    lat: { type: Number },
    lng: { type: Number }
  },

  // Items in the order
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: { type: String },      // saved at time of order (product name may change later)
    price: { type: Number },
    qty: { type: Number },
    total: { type: Number },
    image: { type: String }
  }],

  // Money
  subtotal: { type: Number, required: true },
  deliveryCharge: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  total: { type: Number, required: true },

  // Payment
  paymentMethod: {
    type: String,
    enum: ['cod', 'card_on_delivery', 'online', 'pickup', 'bank_transfer'],
    default: 'cod'
  },
  paymentStatus: { type: String, enum: ['pending', 'paid'], default: 'pending' },

  // Order Progress
  orderStatus: {
    type: String,
    enum: ['new', 'confirmed', 'packing', 'out_for_delivery', 'delivered', 'cancelled'],
    default: 'new'
  },

  // How was this order placed?
  channel: {
    type: String,
    enum: ['whatsapp', 'website', 'pos', 'manual'],
    default: 'website'
  },

  // Delivery Rider
  riderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Rider' },

  // Extra
  notes: { type: String },            // customer's special instructions
  invoiceUrl: { type: String },       // PDF invoice link
  invoiceSent: { type: Boolean, default: false },
  merchantTransactionId: { type: String },  // PhonePe / payment gateway txn ID
  whatsappNotified: { type: Boolean, default: false },
  prescriptionImage: { type: String },// for pharmacy orders
  isCreditSale: { type: Boolean, default: false }, // buy now pay later

}, { timestamps: true });

// Auto-generate sequential orderId per shop (1001, 1002...)
OrderSchema.pre('save', async function (next) {
  if (this.isNew) {
    const lastOrder = await this.constructor
      .findOne({ shopId: this.shopId })
      .sort({ orderId: -1 });
    this.orderId = lastOrder ? lastOrder.orderId + 1 : 1001;
  }
  next();
});

module.exports = mongoose.model('Order', OrderSchema);
