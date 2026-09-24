// ===========================================
// SOUQLY API SERVER
// FaizeCart Online Services OPC Pvt Ltd
// GSTIN: 32AAFCF7417G1ZU | Kochi, Kerala
// ===========================================

// Load environment variables first (before anything else)
require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');

const connectDB = require('./config/db');
const setupOrderSocket = require('./socket/orderSocket');

// Connect to MongoDB
connectDB();

const app = express();
const server = http.createServer(app);

// Setup Socket.io (allows real-time updates)
const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:3003',
      'http://localhost:3004',
      'http://localhost:3005',
      'http://localhost:8081',
      'http://localhost:19006',
      process.env.FRONTEND_URL
    ].filter(Boolean),
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Make io accessible in routes (for sending real-time events)
app.set('io', io);
setupOrderSocket(io);

// ========== MIDDLEWARE ==========

// Security headers
app.use(helmet());

// Allow requests from frontend
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003',
    'http://localhost:3004',
    'http://localhost:3005',
    'http://localhost:8081',
    'http://localhost:19006',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true
}));

// Log all requests (shows method, URL, status, time in terminal)
app.use(morgan('dev'));

// Parse cookies (for httpOnly JWT cookie)
app.use(cookieParser());

// Parse JSON request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting - max 100 requests per minute per IP (exclude webhook — Meta sends bursts)
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests. Please slow down.' }
});
app.use('/api/', (req, res, next) => {
  if (req.path.startsWith('/webhook/')) return next();
  return limiter(req, res, next);
});

// ========== ROUTES ==========
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/shop', require('./routes/shop.routes'));
app.use('/api/products', require('./routes/product.routes'));
app.use('/api/orders', require('./routes/order.routes'));
app.use('/api/riders', require('./routes/rider.routes'));
app.use('/api/payment', require('./routes/payment.routes'));
app.use('/api/whatsapp', require('./routes/whatsapp.routes'));
app.use('/api/broadcast', require('./routes/broadcast.routes'));
app.use('/api/analytics', require('./routes/analytics.routes'));
app.use('/api/customer', require('./routes/customer.routes'));
app.use('/api/admin', require('./routes/admin.routes'));
app.use('/api/coupons', require('./routes/coupon.routes'));
app.use('/api/reviews', require('./routes/review.routes'));
app.use('/api/subscription', require('./routes/subscription.routes'));
app.use('/api/invoices', require('./routes/invoice.routes'));
app.use('/api/reports', require('./routes/reports.routes'));
app.use('/api/webhook', require('./routes/webhook.routes'));
app.use('/api/phonepe', require('./routes/phonepe.routes'));
app.use('/api/wa-connect', require('./routes/wa_connect.routes'));
app.use('/api/banners',   require('./routes/banner.routes'));
app.use('/api/theme',     require('./routes/theme.routes'));

// Health check route (test if API is running)
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Souqly API is running!',
    version: '1.0.0',
    company: 'FaizeCart Online Services OPC Pvt Ltd',
    timestamp: new Date()
  });
});

// ========== GLOBAL ERROR HANDLER ==========
// Catches any unhandled errors in routes
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Something went wrong on the server.'
  });
});

// ========== START SERVER ==========
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log('');
  console.log('🚀 ============================================');
  console.log(`   Souqly API running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health`);
  console.log('   Company: FaizeCart Online Services OPC');
  console.log('   GSTIN: 32AAFCF7417G1ZU');
  console.log('🚀 ============================================');
  console.log('');
});
