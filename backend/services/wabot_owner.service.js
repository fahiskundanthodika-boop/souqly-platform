/**
 * Souqly WhatsApp Owner Bot
 * Shop owners manage their entire business via WhatsApp chat.
 *
 * Triggered when owner messages the SOUQLY platform number.
 * Customer orders use a separate bot (wabot.service.js).
 *
 * Features:
 *  - Register new shop account
 *  - Login to existing shop
 *  - View today's orders
 *  - Update order status
 *  - Add products one by one
 *  - View product list
 */

const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const WaOwnerSession = require('../models/WaOwnerSession');
const Shop     = require('../models/Shop');
const Product  = require('../models/Product');
const Order    = require('../models/Order');
const { sendText, normalisePhone } = require('./wabot.service');

const SOUQLY_CREDS = null; // uses Souqly's own Meta number for owner bot

const CATEGORIES = ['Restaurant', 'Grocery', 'Bakery', 'Pharmacy', 'Supermarket', 'Other'];

// ── Session helpers ───────────────────────────────────────────────────────────

async function getSession(phone) {
  return WaOwnerSession.findOne({ phone });
}

async function saveSession(phone, update) {
  return WaOwnerSession.findOneAndUpdate(
    { phone },
    { ...update, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
    { upsert: true, new: true }
  );
}

async function clearSession(phone) {
  return WaOwnerSession.deleteOne({ phone });
}

// ── Main handler ──────────────────────────────────────────────────────────────

async function handleOwnerMessage(phone, text) {
  const raw  = (text || '').trim();
  const t    = raw.toLowerCase();

  // Global commands
  if (t === 'cancel' || t === 'exit' || t === 'logout') {
    await clearSession(phone);
    await sendText(phone, '👋 Logged out. Send *hi* to start again.', SOUQLY_CREDS);
    return;
  }

  const session = await getSession(phone);

  // ── No session or start ──────────────────────────────────────────────────
  if (!session || t === 'hi' || t === 'hello' || t === 'start') {
    // Check if this phone is already a registered shop owner
    const existingShop = await Shop.findOne({ phone: normalisePhone(phone) });

    if (existingShop) {
      await saveSession(phone, { shopId: existingShop._id, step: 'logged_in' });
      await sendShopMenu(phone, existingShop);
    } else {
      await saveSession(phone, { step: 'start' });
      await sendText(phone,
        `👋 Welcome to *Souqly*!\n\n` +
        `The #1 WhatsApp ordering platform for your business.\n\n` +
        `1️⃣ Create my shop\n` +
        `2️⃣ Login to existing shop\n\n` +
        `Reply *1* or *2*`,
        SOUQLY_CREDS
      );
    }
    return;
  }

  // ── Route by step ────────────────────────────────────────────────────────
  switch (session.step) {

    case 'start':
      if (t === '1' || t === 'create' || t === 'register') {
        await saveSession(phone, { ...session.toObject(), step: 'register_name' });
        await sendText(phone, `🏪 Let's set up your shop!\n\nWhat's your *shop name*?`, SOUQLY_CREDS);
      } else if (t === '2' || t === 'login') {
        await saveSession(phone, { ...session.toObject(), step: 'login_email' });
        await sendText(phone, `🔐 Login\n\nEnter your *email address*:`, SOUQLY_CREDS);
      } else {
        await sendText(phone, 'Reply *1* to create a shop or *2* to login.', SOUQLY_CREDS);
      }
      break;

    // ── Registration flow ──────────────────────────────────────────────────
    case 'register_name':
      if (raw.length < 2) { await sendText(phone, 'Please enter a valid shop name.', SOUQLY_CREDS); return; }
      await saveSession(phone, { ...session.toObject(), step: 'register_category', tempData: { name: raw } });
      await sendText(phone,
        `Great! *${raw}*\n\nWhat's your business category?\n\n` +
        CATEGORIES.map((c, i) => `${i + 1}. ${c}`).join('\n'),
        SOUQLY_CREDS
      );
      break;

    case 'register_category': {
      const n = parseInt(t, 10);
      const cat = CATEGORIES[n - 1] || CATEGORIES.find(c => c.toLowerCase() === t);
      if (!cat) {
        await sendText(phone, `Please reply with a number 1–${CATEGORIES.length}:\n` + CATEGORIES.map((c, i) => `${i + 1}. ${c}`).join('\n'), SOUQLY_CREDS);
        return;
      }
      await saveSession(phone, { ...session.toObject(), step: 'register_email', tempData: { ...session.tempData, category: cat.toLowerCase() } });
      await sendText(phone, `📧 Enter your *email address*:`, SOUQLY_CREDS);
      break;
    }

    case 'register_email': {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) {
        await sendText(phone, 'Please enter a valid email address.', SOUQLY_CREDS);
        return;
      }
      const existing = await Shop.findOne({ email: raw.toLowerCase() });
      if (existing) {
        await sendText(phone, `❌ Email already registered. Reply *2* to login instead.`, SOUQLY_CREDS);
        await saveSession(phone, { ...session.toObject(), step: 'start' });
        return;
      }
      await saveSession(phone, { ...session.toObject(), step: 'register_password', tempData: { ...session.tempData, email: raw.toLowerCase() } });
      await sendText(phone, `🔒 Set a *password* (min 8 characters):`, SOUQLY_CREDS);
      break;
    }

    case 'register_password':
      if (raw.length < 8) {
        await sendText(phone, 'Password must be at least 8 characters. Try again:', SOUQLY_CREDS);
        return;
      }
      await saveSession(phone, { ...session.toObject(), step: 'register_ownerName', tempData: { ...session.tempData, password: raw } });
      await sendText(phone, `👤 Your *full name* (owner name):`, SOUQLY_CREDS);
      break;

    case 'register_ownerName': {
      if (raw.length < 2) { await sendText(phone, 'Please enter your name.', SOUQLY_CREDS); return; }
      const d = { ...session.tempData, ownerName: raw };

      // Create the shop
      try {
        const shop = await Shop.create({
          name:      d.name,
          ownerName: d.ownerName,
          email:     d.email,
          password:  d.password,
          phone:     normalisePhone(phone),
          whatsappNumber: phone,
          category:  d.category,
          plan:      'free',
          isActive:  true
        });

        await saveSession(phone, { shopId: shop._id, step: 'logged_in', tempData: {} });

        await sendText(phone,
          `🎉 *Shop Created Successfully!*\n\n` +
          `🏪 Shop: *${shop.name}*\n` +
          `🔗 Store: https://frontend-flax-kappa-65.vercel.app/store/${shop.slug}\n` +
          `📊 Dashboard: https://frontend-flax-kappa-65.vercel.app/dashboard\n` +
          `📧 Email: ${shop.email}\n\n` +
          `Now let's add your products! Reply *add product* or manage from dashboard.`,
          SOUQLY_CREDS
        );

        await sendShopMenu(phone, shop);
      } catch (err) {
        await sendText(phone, `❌ Error: ${err.message}. Please try again.`, SOUQLY_CREDS);
        await clearSession(phone);
      }
      break;
    }

    // ── Login flow ────────────────────────────────────────────────────────
    case 'login_email': {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) {
        await sendText(phone, 'Please enter a valid email address.', SOUQLY_CREDS);
        return;
      }
      await saveSession(phone, { ...session.toObject(), step: 'login_password', tempData: { email: raw.toLowerCase() } });
      await sendText(phone, `🔒 Enter your *password*:`, SOUQLY_CREDS);
      break;
    }

    case 'login_password': {
      const shop = await Shop.findOne({ email: session.tempData?.email }).select('+password');
      if (!shop) {
        await sendText(phone, '❌ Email not found. Reply *1* to create a shop.', SOUQLY_CREDS);
        await saveSession(phone, { ...session.toObject(), step: 'start', tempData: {} });
        return;
      }
      const match = await bcrypt.compare(raw, shop.password);
      if (!match) {
        await sendText(phone, '❌ Wrong password. Try again:', SOUQLY_CREDS);
        return;
      }
      await saveSession(phone, { shopId: shop._id, step: 'logged_in', tempData: {} });
      await sendText(phone, `✅ Logged in as *${shop.name}*!`, SOUQLY_CREDS);
      await sendShopMenu(phone, shop);
      break;
    }

    // ── Logged in — main menu ─────────────────────────────────────────────
    case 'logged_in':
      await handleLoggedIn(phone, session, t, raw);
      break;

    // ── Add product flow ──────────────────────────────────────────────────
    case 'add_product_name':
      if (raw.length < 2) { await sendText(phone, 'Enter product name:', SOUQLY_CREDS); return; }
      await saveSession(phone, { ...session.toObject(), step: 'add_product_price', tempData: { pName: raw } });
      await sendText(phone, `💰 Price of *${raw}* (₹)?`, SOUQLY_CREDS);
      break;

    case 'add_product_price': {
      const price = parseFloat(t);
      if (!price || price <= 0) { await sendText(phone, 'Enter a valid price (e.g. 150):', SOUQLY_CREDS); return; }
      await saveSession(phone, { ...session.toObject(), step: 'add_product_category', tempData: { ...session.tempData, pPrice: price } });
      await sendText(phone,
        `📁 Category for *${session.tempData.pName}*?\n\n` +
        `Type the category name (e.g. Breads, Cakes, Drinks) or reply *skip*:`,
        SOUQLY_CREDS
      );
      break;
    }

    case 'add_product_category': {
      const cat = t === 'skip' ? 'General' : raw;
      await saveSession(phone, { ...session.toObject(), step: 'add_product_unit', tempData: { ...session.tempData, pCategory: cat } });
      await sendText(phone, `📦 Unit for *${session.tempData.pName}*?\n\nExamples: piece, kg, litre, pack, 250g\nOr reply *skip*:`, SOUQLY_CREDS);
      break;
    }

    case 'add_product_unit': {
      const unit = t === 'skip' ? 'piece' : raw;
      const d = session.tempData;

      try {
        const product = await Product.create({
          shopId:      session.shopId,
          name:        d.pName,
          price:       d.pPrice,
          category:    d.pCategory,
          unit,
          isAvailable: true,
          stock:       999
        });

        await saveSession(phone, { ...session.toObject(), step: 'logged_in', tempData: {} });

        await sendText(phone,
          `✅ *${product.name}* added!\n` +
          `Price: ₹${product.price} | Category: ${product.category} | Unit: ${product.unit}\n\n` +
          `Reply *add product* to add another or *menu* for options.`,
          SOUQLY_CREDS
        );
      } catch (err) {
        await sendText(phone, `❌ Error: ${err.message}`, SOUQLY_CREDS);
        await saveSession(phone, { ...session.toObject(), step: 'logged_in', tempData: {} });
      }
      break;
    }

    default:
      await saveSession(phone, { ...session.toObject(), step: 'logged_in' });
      await handleLoggedIn(phone, session, t, raw);
  }
}

// ── Logged-in menu handler ────────────────────────────────────────────────────

async function handleLoggedIn(phone, session, t, raw) {
  if (t === 'menu' || t === '0') {
    const shop = await Shop.findById(session.shopId).lean();
    await sendShopMenu(phone, shop);
    return;
  }

  if (t === '1' || t === 'orders' || t === 'today orders') {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const orders = await Order.find({
      shopId: session.shopId,
      createdAt: { $gte: today }
    }).sort({ createdAt: -1 }).limit(10).lean();

    if (!orders.length) {
      await sendText(phone, `📦 No orders today yet.\n\nReply *menu* for options.`, SOUQLY_CREDS);
      return;
    }

    const lines = [`📦 *Today's Orders (${orders.length})*\n`];
    for (const o of orders) {
      const statusEmoji = { new: '🆕', confirmed: '✅', packing: '📦', out_for_delivery: '🚚', delivered: '✅', cancelled: '❌' };
      lines.push(`#${o.orderId} — ${o.customerName} — ₹${o.total} ${statusEmoji[o.orderStatus] || ''} ${o.orderStatus}`);
    }
    lines.push(`\nReply *menu* for options.`);
    await sendText(phone, lines.join('\n'), SOUQLY_CREDS);
    return;
  }

  if (t === '2' || t === 'add product' || t === 'add') {
    await saveSession(phone, { ...session.toObject(), step: 'add_product_name' });
    await sendText(phone, `🛍 *Add Product*\n\nProduct name?`, SOUQLY_CREDS);
    return;
  }

  if (t === '3' || t === 'products' || t === 'my products') {
    const products = await Product.find({ shopId: session.shopId }).sort('name').lean();
    if (!products.length) {
      await sendText(phone, `No products yet. Reply *add product* to add your first.`, SOUQLY_CREDS);
      return;
    }
    const lines = [`🛍 *Your Products (${products.length})*\n`];
    products.forEach((p, i) => {
      lines.push(`${i + 1}. ${p.name} — ₹${p.price} ${p.isAvailable ? '✅' : '❌'}`);
    });
    lines.push(`\nReply *add product* to add more or *menu* for options.`);
    await sendText(phone, lines.join('\n'), SOUQLY_CREDS);
    return;
  }

  if (t === '4' || t === 'stats') {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [todayOrders, totalOrders] = await Promise.all([
      Order.countDocuments({ shopId: session.shopId, createdAt: { $gte: today } }),
      Order.countDocuments({ shopId: session.shopId })
    ]);
    const revenue = await Order.aggregate([
      { $match: { shopId: session.shopId, orderStatus: 'delivered' } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    await sendText(phone,
      `📊 *Your Shop Stats*\n\n` +
      `📦 Today's orders: ${todayOrders}\n` +
      `📦 Total orders: ${totalOrders}\n` +
      `💰 Total revenue: ₹${revenue[0]?.total || 0}\n\n` +
      `Reply *menu* for options.`,
      SOUQLY_CREDS
    );
    return;
  }

  // Unknown command
  const shop = await Shop.findById(session.shopId).lean();
  await sendShopMenu(phone, shop);
}

// ── Shop menu ─────────────────────────────────────────────────────────────────

async function sendShopMenu(phone, shop) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayOrders = await Order.countDocuments({ shopId: shop._id, createdAt: { $gte: today } });

  await sendText(phone,
    `🏪 *${shop.name}* Dashboard\n\n` +
    `📦 Today: ${todayOrders} orders\n\n` +
    `1️⃣ Today's orders\n` +
    `2️⃣ Add product\n` +
    `3️⃣ My products\n` +
    `4️⃣ Stats\n\n` +
    `🔗 Store: https://frontend-flax-kappa-65.vercel.app/store/${shop.slug}\n` +
    `📊 Dashboard: https://frontend-flax-kappa-65.vercel.app/dashboard\n\n` +
    `Reply *logout* to sign out.`,
    SOUQLY_CREDS
  );
}

module.exports = { handleOwnerMessage };
