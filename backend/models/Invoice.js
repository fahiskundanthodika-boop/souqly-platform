// Invoice model - GST invoice record for each order
const mongoose = require('mongoose');

const InvoiceSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },

  invoiceNumber: { type: String, required: true, unique: true }, // e.g. INV-2024-1001

  // Seller (Shop) details at time of invoice
  sellerName: { type: String },
  sellerGST: { type: String },
  sellerAddress: { type: String },

  // Buyer (Customer) details
  buyerName: { type: String },
  buyerPhone: { type: String },
  buyerAddress: { type: String },

  // Line items with GST breakdown
  items: [{
    name: String,
    qty: Number,
    price: Number,
    hsnCode: String,
    gstRate: Number,
    gstAmount: Number,
    total: Number
  }],

  subtotal: { type: Number },
  totalGST: { type: Number },
  deliveryCharge: { type: Number },
  discount: { type: Number, default: 0 },
  grandTotal: { type: Number },

  pdfUrl: { type: String }, // Cloudinary PDF link

}, { timestamps: true });

module.exports = mongoose.model('Invoice', InvoiceSchema);
