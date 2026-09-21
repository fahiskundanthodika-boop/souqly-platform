const mongoose = require('mongoose');

const BannerSchema = new mongoose.Schema({
  shopId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  type:         { type: String, enum: ['hero', 'mini', 'side', 'flash'], required: true },
  title:        { type: String, required: true },
  subtitle:     { type: String, default: '' },
  tag:          { type: String, default: '' },
  emoji:        { type: String, default: '🎉' },
  background:   { type: String, default: 'linear-gradient(135deg,#0a1628,#1a3a6e)' },
  tagColor:     { type: String, default: '#FF6B35' },
  linkTo:       { type: String, default: 'all' },
  buttonText:   { type: String, default: 'Shop Now' },
  isActive:     { type: Boolean, default: true },
  order:        { type: Number, default: 0 },
  flashEndDate: { type: Date },
  flashEndTime: { type: String },
  createdAt:    { type: Date, default: Date.now },
});

module.exports = mongoose.model('Banner', BannerSchema);
