// Branch model - A shop can have multiple locations/branches
const mongoose = require('mongoose');

const BranchSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },

  branchName: { type: String, required: true }, // e.g. "Main Branch", "Karama Branch"
  branchCode: { type: String },                 // short code e.g. "KRM"

  address: { type: String },
  city: { type: String },

  managerName: { type: String },
  managerPhone: { type: String },

  isActive: { type: Boolean, default: true },
  deliveryRadius: { type: Number, default: 5 }, // km

}, { timestamps: true });

module.exports = mongoose.model('Branch', BranchSchema);
