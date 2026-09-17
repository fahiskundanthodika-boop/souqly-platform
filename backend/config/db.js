// Connects our app to MongoDB database
const mongoose = require('mongoose');
const dns = require('dns');

// Use Google's DNS server to resolve MongoDB Atlas SRV records
dns.setServers(['8.8.8.8', '8.8.4.4']);

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
    family: 4  // force IPv4 to avoid DNS SRV lookup issues
  });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Error: ${error.message}`);
    // Exit the app if database fails to connect
    process.exit(1);
  }
};

module.exports = connectDB;
