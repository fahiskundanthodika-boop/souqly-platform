/**
 * Souqly WhatsApp Ordering Bot
 * Handles conversational ordering via Meta WhatsApp Cloud API
 *
 * Flow:
 *  Customer sends "hi" or "order <shopslug>"
 *  → Bot greets + shows menu (numbered list)
 *  → Customer picks product by number
 *  → Bot adds to cart, shows cart
 *  → Customer says "done" → Bot asks name
 *  → Customer gives name → Bot asks address
 *  → Customer gives address → Bot shows order summary
 *  → Customer says "confirm" → Order created → Confirmation sent
 *
 * At any point:
 *  "cart"   = show current cart
 *  "cancel" = clear session and start over
 *  "repeat" = reorder last order
 */

const axios = require('axios');
const WaSession = require('../models/WaSession');
const Shop      = require('../models/Shop');
const Product   = require('../models/Product');
const Order     = require('../models/Order');
const Customer  = require('../models/Customer');

const BASE_URL = `https://graph.facebook.com/v18.0`;
const PHONE_ID = process.env.META_PHONE_NUMBER_ID;
const TOKEN    = process.env.META_ACCESS_TOKEN;

// ── Low-level send ────────────────────────────────────────────────────────────

function normalisePhone(phone) {
  let p = String(phone).replace(/\D/g, '');
  if (p.length === 10) p = '91' + p;
  return p;
}

// Send using shop's own credentials if connected, else fall back to Souqly's number
async function sendText(to, body, shopCreds = null) {
  const phoneId = shopCreds?.phoneNumberId || PHONE_ID;
  const token   = shopCreds?.accessToken   || TOKEN;

  if (!phoneId || !token) {
    console.log(`[WA Bot → ${to}]`, body);
    return;
  }
  try {
    await axios.post(
      `${BASE_URL}/${phoneId}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: normalisePhone(to),
        type: 'text',
        text: { body, preview_url: false }
      },
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[WA Bot send error]', err.response?.data || err.message);
  }
}

// ── Session helpers ───────────────────────────────────────────────────────────

function freshExpiry() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
}

async function getOrInitSession(phone) {
  return WaSession.findOne({ phone });
}

async function saveSession(phone, update) {
  return WaSession.findOneAndUpdate(
    { phone },
    { ...update, expiresAt: freshExpiry() },
    { upsert: true, new: true }
  );
}

async function clearSession(phone) {
  return WaSession.deleteOne({ phone });
}

// Get shop credentials from Shop document (called once per session start)
async function getShopCreds(shopId) {
  const shop = await Shop.findById(shopId).select('whatsappApi').lean();
  if (shop?.whatsappApi?.connected) {
    return { phoneNumberId: shop.whatsappApi.phoneNumberId, accessToken: shop.whatsappApi.accessToken };
  }
  return null; // falls back to Souqly's shared number
}

// ── Cart formatting ───────────────────────────────────────────────────────────

function formatCart(cart) {
  if (!cart || cart.length === 0) return '_(empty)_';
  const lines = cart.map(i => `• ${i.name} x${i.qty} = ₹${i.price * i.qty}`);
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  return lines.join('\n') + `\n\n*Total: ₹${total}*`;
}

function cartTotal(cart) {
  return cart.reduce((s, i) => s + i.price * i.qty, 0);
}

// ── Menu builder ──────────────────────────────────────────────────────────────

function buildMenu(products) {
  // Group by category
  const grouped = {};
  for (const p of products) {
    const cat = p.category || 'Other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(p);
  }

  const lines = [
    '🛒 *Menu*',
    'Reply with the number to add an item.\n'
  ];

  let idx = 1;
  const index = []; // [{n, product}]

  for (const [cat, items] of Object.entries(grouped)) {
    lines.push(`*${cat}*`);
    for (const p of items) {
      lines.push(`${idx}. ${p.name} – ₹${p.price}${p.unit ? ' / ' + p.unit : ''}`);
      index.push({ n: idx, product: p });
      idx++;
    }
    lines.push('');
  }

  lines.push('📦 Reply *done* to checkout');
  lines.push('🛒 Reply *cart* to view cart');
  lines.push('❌ Reply *cancel* to start over');

  return { text: lines.join('\n'), index };
}

// ── Main handler (called from webhook) ───────────────────────────────────────

// shopCreds: { phoneNumberId, accessToken, shopId, shopSlug, shopName } — set when
// the message arrived on a shop's OWN connected number (not Souqly's shared number)
async function handleIncoming(phone, msgType, msgText, interactiveId, shopCreds = null) {
  const raw  = (msgText || '').trim();
  const text = raw.toLowerCase();

  // ── Global commands ─────────────────────────────────
  if (text === 'cancel' || text === 'reset' || text === 'restart') {
    await clearSession(phone);
    await sendText(phone, '🔄 Session cleared. Send *hi* or your shop order link to start fresh.', shopCreds);
    return;
  }

  // ── Load session ────────────────────────────────────
  let session = await getOrInitSession(phone);

  // ── If message came on a shop's OWN number, auto-identify the shop ──
  // Customer doesn't need to type "order slug" — the number already tells us which shop
  if (shopCreds?.shopSlug && (!session?.shopSlug || session.shopSlug !== shopCreds.shopSlug)) {
    const shop = await Shop.findOne({ slug: shopCreds.shopSlug, isActive: true });
    if (shop) {
      const products = await Product.find({ shopId: shop._id, isAvailable: true }).sort('name').lean();
      const { text: menuText, index } = buildMenu(products);
      session = await saveSession(phone, {
        shopId: shop._id,
        shopSlug: shop.slug,
        shopName: shop.name,
        step: 'browsing',
        cart: [],
        products: index.map(i => ({ n: i.n, _id: String(i.product._id), name: i.product.name, price: i.product.price, unit: i.product.unit || '' })),
        customerName: null
      });
      await sendText(phone, `👋 Welcome to *${shop.name}*!\n\n${menuText}`, shopCreds);
      return;
    }
  }

  // ── Detect "order <slug>" start trigger (shared Souqly number) ──────
  const isStart = !session || text === 'hi' || text === 'hello' || text === 'start' || text === 'menu' || text.startsWith('order ');

  if (isStart) {
    let shopSlug = null;

    if (text.startsWith('order ')) {
      shopSlug = text.split(/\s+/)[1]?.replace(/[^a-z0-9-]/g, '');
    } else if (session?.shopSlug) {
      shopSlug = session.shopSlug;
    }

    if (!shopSlug) {
      await sendText(phone,
        '👋 Welcome to *Souqly*!\n\n' +
        'To order, please use your shop\'s WhatsApp order link, or reply:\n' +
        '*order <shopname>*\n\nExample: order mybakery',
        shopCreds
      );
      return;
    }

    const shop = await Shop.findOne({ slug: shopSlug, isActive: true });
    if (!shop) {
      await sendText(phone, `❌ Shop *${shopSlug}* not found. Please check the link and try again.`);
      return;
    }

    // Load products for this shop
    const products = await Product.find({ shopId: shop._id, isAvailable: true }).sort('name').lean();
    if (products.length === 0) {
      await sendText(phone, `Sorry, *${shop.name}* has no products available right now. Please try again later.`);
      return;
    }

    const { text: menuText, index } = buildMenu(products);

    session = await saveSession(phone, {
      shopId: shop._id,
      shopSlug: shop.slug,
      shopName: shop.name,
      step: 'browsing',
      cart: session?.shopSlug === shop.slug ? (session.cart || []) : [],
      products: index.map(i => ({
        n: i.n,
        _id: String(i.product._id),
        name: i.product.name,
        price: i.product.price,
        unit: i.product.unit || ''
      })),
      customerName: session?.shopSlug === shop.slug ? session.customerName : null,
    });

    await sendText(phone, `👋 Welcome to *${shop.name}*!\n\n${menuText}`);
    return;
  }

  // ── No active session, no shop context ──────────────
  if (!session || !session.shopId) {
    await sendText(phone,
      '👋 Hi! Send *hi* or use your shop\'s order link to start ordering.\n\nReply *cancel* to reset.',
      shopCreds
    );
    return;
  }

  // ── Resolve shop credentials for sending replies ─────
  // Use passed-in creds (own number) or look up from shop record
  const creds = shopCreds || await getShopCreds(session.shopId);

  // ── Route by step ────────────────────────────────────
  switch (session.step) {

    case 'browsing':
      await handleBrowsing(phone, session, text, raw, creds);
      break;

    case 'get_name':
      await handleGetName(phone, session, raw, creds);
      break;

    case 'get_address':
      await handleGetAddress(phone, session, raw, creds);
      break;

    case 'confirm':
      await handleConfirm(phone, session, text, creds);
      break;

    default:
      await saveSession(phone, { ...session.toObject(), step: 'browsing' });
      await sendText(phone, 'Reply with a product number, *done*, *cart*, or *cancel*.', creds);
  }
}

// ── Step: browsing ────────────────────────────────────────────────────────────

async function handleBrowsing(phone, session, text, raw, creds) {
  // "cart" → show cart
  if (text === 'cart') {
    const cartText = formatCart(session.cart);
    await sendText(phone,
      `🛒 *Your Cart*\n\n${cartText}\n\n` +
      'Reply with a number to add more, *done* to checkout, or *cancel* to start over.',
      creds
    );
    return;
  }

  // "done" → move to checkout
  if (text === 'done' || text === 'checkout') {
    if (!session.cart || session.cart.length === 0) {
      await sendText(phone, '🛒 Your cart is empty. Reply with a product number to add items.', creds);
      return;
    }
    await saveSession(phone, { ...session.toObject(), step: 'get_name' });
    const name = session.customerName ? `(${session.customerName} — reply to keep or type a new name)` : '';
    await sendText(phone,
      `📝 Almost done! First, what\'s your *name*? ${name}\n\nReply *cancel* to start over.`,
      creds
    );
    return;
  }

  // "repeat" → reorder last order
  if ((text === 'repeat' || text === '1' && session.step === 'repeat') && session.lastOrderId) {
    const lastOrder = await Order.findById(session.lastOrderId).lean();
    if (lastOrder) {
      const cart = lastOrder.items.map(i => ({
        productId: String(i.product),
        name: i.name,
        price: i.price,
        qty: i.qty
      }));
      await saveSession(phone, { ...session.toObject(), cart, step: 'get_address' });
      await sendText(phone,
        `♻️ *Repeat Order loaded!*\n\n${formatCart(cart)}\n\n` +
        'Please confirm your *delivery address*:',
        creds
      );
      return;
    }
  }

  // Number → add product
  const n = parseInt(text, 10);
  if (!isNaN(n) && n > 0) {
    const found = (session.products || []).find(p => p.n === n);
    if (!found) {
      await sendText(phone, `❓ Product *${n}* not found. Reply with a valid number from the menu.`);
      return;
    }

    const cart = session.cart || [];
    const existing = cart.find(c => c.productId === found._id);
    let newCart;
    if (existing) {
      newCart = cart.map(c =>
        c.productId === found._id ? { ...c, qty: c.qty + 1 } : c
      );
    } else {
      newCart = [...cart, { productId: found._id, name: found.name, price: found.price, qty: 1 }];
    }

    await saveSession(phone, { ...session.toObject(), cart: newCart });

    const totalItems = newCart.reduce((s, i) => s + i.qty, 0);
    await sendText(phone,
      `✅ Added *${found.name}* (₹${found.price})\n\n` +
      `🛒 Cart: ${totalItems} item${totalItems > 1 ? 's' : ''} · ₹${cartTotal(newCart)}\n\n` +
      'Add more items or reply *done* to checkout.',
      creds
    );
    return;
  }

  // "remove N" → remove by number
  if (text.startsWith('remove ')) {
    const rn = parseInt(text.split(' ')[1], 10);
    const found = (session.products || []).find(p => p.n === rn);
    if (found) {
      const newCart = (session.cart || []).filter(c => c.productId !== found._id);
      await saveSession(phone, { ...session.toObject(), cart: newCart });
      await sendText(phone, `🗑 Removed *${found.name}* from cart.\n\n${formatCart(newCart)}`, creds);
      return;
    }
  }

  // Unrecognised input → re-show help
  await sendText(phone,
    '❓ Not sure what you mean.\n\n' +
    'Reply with a *product number* to add, *done* to checkout, *cart* to view cart, or *cancel* to reset.\n' +
    'Send *menu* to see the full menu again.',
    creds
  );
}

// ── Step: get_name ────────────────────────────────────────────────────────────

async function handleGetName(phone, session, raw, creds) {
  if (!raw || raw.length < 2) {
    await sendText(phone, 'Please tell us your name to continue.', creds);
    return;
  }
  await saveSession(phone, { ...session.toObject(), customerName: raw, step: 'get_address' });
  await sendText(phone,
    `Thanks *${raw}*! 📍\n\nPlease type your *full delivery address* (house/flat, street, landmark, city, pincode):`,
    creds
  );
}

// ── Step: get_address ─────────────────────────────────────────────────────────

async function handleGetAddress(phone, session, raw, creds) {
  if (!raw || raw.length < 5) {
    await sendText(phone, 'Please provide your full delivery address to continue.', creds);
    return;
  }

  const shop = await Shop.findById(session.shopId).lean();
  const deliveryCharge = shop?.deliveryCharge || 40;
  const freeAbove = shop?.freeDeliveryAbove || 0;
  const subtotal = cartTotal(session.cart);
  const delivery = freeAbove > 0 && subtotal >= freeAbove ? 0 : deliveryCharge;
  const grandTotal = subtotal + delivery;

  await saveSession(phone, { ...session.toObject(), step: 'confirm', pendingAddress: raw });

  const deliveryLine = delivery === 0 ? 'Delivery: FREE 🎉' : `Delivery: ₹${delivery}`;

  await sendText(phone,
    `📋 *Order Summary*\n\n` +
    `Shop: ${session.shopName}\n` +
    `Name: ${session.customerName}\n` +
    `Address: ${raw}\n\n` +
    `*Items:*\n${formatCart(session.cart)}\n\n` +
    `${deliveryLine}\n` +
    `*Grand Total: ₹${grandTotal}*\n\n` +
    'Reply *confirm* to place your order\nReply *cancel* to start over',
    creds
  );
}

// ── Step: confirm ─────────────────────────────────────────────────────────────

async function handleConfirm(phone, session, text, creds) {
  if (text !== 'confirm' && text !== 'yes' && text !== 'ok') {
    await sendText(phone, 'Reply *confirm* to place your order or *cancel* to start over.', creds);
    return;
  }

  // Fetch shop
  const shop = await Shop.findById(session.shopId).lean();
  if (!shop) {
    await sendText(phone, '❌ Shop not found. Please start over with *hi*.', creds);
    await clearSession(phone);
    return;
  }

  // Calculate totals
  const subtotal = cartTotal(session.cart);
  const deliveryCharge = shop?.deliveryCharge || 40;
  const freeAbove = shop?.freeDeliveryAbove || 0;
  const delivery = freeAbove > 0 && subtotal >= freeAbove ? 0 : deliveryCharge;
  const grandTotal = subtotal + delivery;

  // Build order items
  const items = session.cart.map(i => ({
    product: i.productId,
    name: i.name,
    price: i.price,
    qty: i.qty,
    total: i.price * i.qty
  }));

  // Generate orderId
  const orderId = 'WA' + Date.now().toString().slice(-6);

  // Upsert customer record
  let customer = await Customer.findOne({ phone: normalisePhone(phone), shopId: session.shopId });
  if (!customer) {
    customer = await Customer.create({
      name: session.customerName,
      phone: normalisePhone(phone),
      shopId: session.shopId,
      address: session.pendingAddress,
      channel: 'whatsapp'
    });
  }

  // Create order
  const order = await Order.create({
    shopId: session.shopId,
    orderId,
    customerName: session.customerName,
    customerPhone: normalisePhone(phone),
    customerAddress: session.pendingAddress,
    items,
    subtotal,
    deliveryCharge: delivery,
    total: grandTotal,
    paymentMethod: 'cod',
    orderStatus: 'new'
  });

  // Update customer stats
  await Customer.findByIdAndUpdate(customer._id, {
    $inc: { totalOrders: 1, totalSpent: grandTotal },
    $set: { name: session.customerName, address: session.pendingAddress, lastOrderAt: new Date() }
  });

  // Update session with lastOrderId, clear cart
  await saveSession(phone, {
    ...session.toObject(),
    cart: [],
    step: 'browsing',
    lastOrderId: String(order._id),
    pendingAddress: null
  });

  const trackUrl = `${process.env.FRONTEND_URL || 'https://souqly.in'}/track/${order._id}`;

  await sendText(phone,
    `🎉 *Order Placed!*\n\n` +
    `Order ID: *#${orderId}*\n` +
    `Total: ₹${grandTotal} (Cash on Delivery)\n\n` +
    `📍 Delivery to: ${session.pendingAddress}\n\n` +
    `Track your order: ${trackUrl}\n\n` +
    `Thank you for ordering from *${session.shopName}*! 🙏\n\n` +
    `Reply *menu* to order again or *repeat* to reorder this.`,
    creds
  );
}

// ── Abandoned cart reminder (called by a cron) ────────────────────────────────

async function sendAbandonedCartReminders() {
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const sessions = await WaSession.find({
    'cart.0': { $exists: true },
    step: 'browsing',
    updatedAt: { $lt: twoHoursAgo },
    expiresAt: { $gt: new Date() }
  });

  for (const s of sessions) {
    try {
      const creds = await getShopCreds(s.shopId);
      await sendText(s.phone,
        `👋 Hey! You left items in your cart at *${s.shopName}*:\n\n` +
        `${formatCart(s.cart)}\n\n` +
        `Reply *done* to complete your order or *cancel* to clear it.`,
        creds
      );
      await WaSession.findByIdAndUpdate(s._id, { step: 'browsing_reminded' });
    } catch (e) {
      console.error('[WA abandoned cart]', e.message);
    }
  }

  return sessions.length;
}

module.exports = { handleIncoming, sendAbandonedCartReminders, sendText, normalisePhone };
