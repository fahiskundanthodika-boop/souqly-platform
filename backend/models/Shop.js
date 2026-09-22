// Shop model - Each business that signs up on Souqly is a "Shop"
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const slugify = require('slugify');

const ShopSchema = new mongoose.Schema({
  // Basic Info
  name: { type: String, required: true, trim: true },
  slug: { type: String, unique: true }, // auto-generated from name e.g. "johns-bakery"

  // Owner Details
  ownerName: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, select: false }, // hidden by default
  phone: { type: String, required: true },
  whatsappNumber: { type: String },

  // Media
  logo: { type: String, default: '' }, // Cloudinary URL

  // Location
  address: { type: String },
  city: { type: String },
  state: { type: String },
  country: { type: String, default: 'India' },

  // Business Type
  category: {
    type: String,
    enum: ['supermarket', 'restaurant', 'pharmacy', 'bakery', 'grocery', 'other'],
    default: 'grocery'
  },

  // Storefront Look
  theme: {
    type: String,
    enum: ['classic-white','dark-premium','fresh-market','medical-pro','spice-route','minimal-clean','night-owl','kerala-kart','arabic-elegance','sweet-tooth','corporate-blue','sunset-glow'],
    default: 'classic-white'
  },
  themeColors: {
    primary:    { type: String, default: '#FF6B35' },
    background: { type: String, default: '#f8f8f8' },
    card:       { type: String, default: '#ffffff' },
    text:       { type: String, default: '#1a1a1a' },
    accent:     { type: String, default: '#FF6B35' },
  },
  colorScheme: { type: String, default: 'default' },
  primaryColor: { type: String, default: '#FF6B35' }, // Souqly orange

  // Subscription Plan
  plan: { type: String, enum: ['free', 'starter', 'growth', 'business'], default: 'free' },
  planStatus: { type: String, enum: ['active', 'grace', 'suspended'], default: 'active' },
  planExpiresAt: { type: Date },

  isActive: { type: Boolean, default: true },

  // Delivery Settings
  deliveryOptions: {
    ownRiderEnabled: { type: Boolean, default: true },
    selfPickupEnabled: { type: Boolean, default: true },
    porterEnabled: { type: Boolean, default: false }
  },
  deliveryCharge: { type: Number, default: 40 },       // in INR
  freeDeliveryAbove: { type: Number, default: 500 },   // order above this = free delivery
  minOrderAmount: { type: Number, default: 0 },
  maxDeliveryKm: { type: Number, default: 10 },

  // Payment Settings
  paymentOptions: {
    codEnabled: { type: Boolean, default: true },
    cardOnDeliveryEnabled: { type: Boolean, default: false },
    onlineEnabled: { type: Boolean, default: false },
    upiId: { type: String, default: '' } // shop owner's own UPI ID
  },

  // GST
  gstNumber: { type: String, default: '' },

  // Stats (auto-updated)
  totalOrders: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 },
  avgRating: { type: Number, default: 0 },
  totalReviews: { type: Number, default: 0 },

  // Push notifications - owner app device token
  fcmToken: { type: String, default: '' },

  // SMS settings (MSG91)
  smsSettings: {
    msg91AuthKey: { type: String, default: '' },
    senderId: { type: String, default: 'SOUQLY' }
  },

  // WhatsApp Business API (each shop's own number)
  whatsappApi: {
    phoneNumberId:  { type: String, default: '' }, // Meta Phone Number ID
    accessToken:    { type: String, default: '' }, // Meta Permanent Access Token
    businessNumber: { type: String, default: '' }, // Display number e.g. +91 98765 43210
    connected:      { type: Boolean, default: false },
    connectedAt:    { type: Date }
  },

  // Loyalty Points settings
  loyaltySettings: {
    enabled: { type: Boolean, default: true },
    pointsPerRupee: { type: Number, default: 1 },    // ₹1 spent = 1 point
    redemptionRate: { type: Number, default: 100 },  // 100 points = ₹1 discount
    minPointsToRedeem: { type: Number, default: 100 }, // min points needed to redeem
    maxRedeemPercent: { type: Number, default: 20 },   // max % of order value redeemable
  },

}, { timestamps: true });

// Auto-generate slug from shop name before saving
ShopSchema.pre('save', async function (next) {
  if (this.isModified('name') || this.isNew) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  // Hash password before saving
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

// Method to check if entered password matches stored hash
ShopSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Shop', ShopSchema);
