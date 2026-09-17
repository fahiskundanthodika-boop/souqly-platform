// BranchInventory - Stock levels per product per branch
const mongoose = require('mongoose');

const BranchInventorySchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },

  stock: { type: Number, default: 0 },
  lowStockAlert: { type: Number, default: 5 },
  lastRestocked: { type: Date },

}, { timestamps: true });

// Unique stock entry per product per branch
BranchInventorySchema.index({ branchId: 1, productId: 1 }, { unique: true });

module.exports = mongoose.model('BranchInventory', BranchInventorySchema);
