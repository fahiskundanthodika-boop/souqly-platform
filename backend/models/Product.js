// Product model - Items that a shop sells
const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },

  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },

  // Pricing
  price: { type: Number, required: true },  // selling price
  mrp: { type: Number },                    // maximum retail price (crossed out)

  // Images (stored on Cloudinary)
  image: { type: String, default: '' },     // main image
  images: [{ type: String }],              // extra images

  // Categorization
  category: { type: String, default: 'General' },
  unit: { type: String, default: 'piece' }, // e.g. kg, litre, piece

  // Inventory
  stock: { type: Number, default: 999 },
  lowStockAlert: { type: Number, default: 5 }, // alert when stock goes below this
  isAvailable: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },

  // Pharmacy / Grocery specific
  batchNumber: { type: String },
  expiryDate: { type: Date },

  // Tax (for GST invoices)
  hsnCode: { type: String, default: '' },  // HSN code for GST
  gstRate: { type: Number, default: 0 },   // GST % e.g. 5, 12, 18

  // Stats
  totalOrders: { type: Number, default: 0 },

}, { timestamps: true });

module.exports = mongoose.model('Product', ProductSchema);
