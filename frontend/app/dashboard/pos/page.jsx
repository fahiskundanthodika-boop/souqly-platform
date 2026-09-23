'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../../components/Sidebar';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const S = {
  bg: '#080808', surface: '#0f0f0f', s2: '#161616',
  border: '#1f1f1f', orange: '#FF6B35', white: '#fff',
  g1: '#a0a0a0', g2: '#606060',
};

const PAYMENT_METHODS = [
  { key: 'cod',              label: 'Cash',   icon: '💵' },
  { key: 'card_on_delivery', label: 'Card',   icon: '💳' },
  { key: 'online',           label: 'UPI',    icon: '📱' },
  { key: 'pickup',           label: 'Pickup', icon: '🏪' },
];

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = 1046;
    g.gain.setValueAtTime(0.3, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
    o.start(); o.stop(ctx.currentTime + 0.1);
    setTimeout(() => ctx.close(), 300);
  } catch {}
}

export default function POSPage() {
  const router = useRouter();
  const [shop, setShop]           = useState(null);
  const [products, setProducts]   = useState([]);
  const [search, setSearch]       = useState('');
  const [cart, setCart]           = useState({});  // { productId: qty }
  const [customer, setCustomer]   = useState('');
  const [phone, setPhone]         = useState('');
  const [payment, setPayment]     = useState('cod');
  const [placing, setPlacing]     = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [toast, setToast]         = useState({ show: false, msg: '', ok: true });
  const searchRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('ownerToken');
    if (!token) { router.push('/login'); return; }
    const shopData = JSON.parse(localStorage.getItem('souqly_shop') || '{}');
    setShop(shopData);

    fetch(`${API}/products/public/${shopData._id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => { if (d.success) setProducts(d.products || []); })
      .catch(() => {});
  }, []);

  const showToast = (msg, ok = true) => {
    setToast({ show: true, msg, ok });
    setTimeout(() => setToast(t => ({ ...t, show: false })), 3000);
  };

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) && p.isAvailable !== false
  );

  const addToCart = (p) => {
    playBeep();
    setCart(c => ({ ...c, [p._id]: (c[p._id] || 0) + 1 }));
  };

  const setQty = (id, qty) => {
    if (qty <= 0) {
      const c = { ...cart }; delete c[id]; setCart(c);
    } else {
      setCart(c => ({ ...c, [id]: qty }));
    }
  };

  const cartItems = products.filter(p => cart[p._id]);
  const subtotal  = cartItems.reduce((s, p) => s + p.price * cart[p._id], 0);
  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);

  const clearCart = () => {
    setCart({}); setCustomer(''); setPhone(''); setPayment('cod');
    searchRef.current?.focus();
  };

  const placeOrder = async () => {
    if (!cartItems.length) return showToast('Cart is empty', false);
    setPlacing(true);
    const token = localStorage.getItem('ownerToken');
    try {
      const res = await fetch(`${API}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          customerName:    customer || 'Walk-in Customer',
          customerPhone:   phone   || '0000000000',
          customerAddress: 'Counter Sale',
          channel:         'pos',
          paymentMethod:   payment,
          paymentStatus:   payment === 'cod' ? 'pending' : 'paid',
          items: cartItems.map(p => ({
            productId: p._id,
            name:      p.name,
            price:     p.price,
            qty:       cart[p._id],
            total:     p.price * cart[p._id],
            image:     p.image || '',
          })),
          subtotal,
          deliveryCharge: 0,
          discount: 0,
          total: subtotal,
        }),
      });
      const d = await res.json();
      if (d.success) {
        setLastOrder(d.order);
        showToast(`Order #${d.order.orderId} placed! ₹${subtotal}`);
        clearCart();
      } else {
        showToast(d.message || 'Failed to place order', false);
      }
    } catch {
      showToast('Network error', false);
    } finally {
      setPlacing(false);
    }
  };

  const printReceipt = () => {
    if (!lastOrder) return;
    const items = lastOrder.items.map(i =>
      `${i.name.padEnd(20)} x${i.qty}  ₹${i.total}`
    ).join('\n');
    const w = window.open('', '', 'width=300,height=600');
    w.document.write(`<pre style="font-family:monospace;font-size:12px;padding:16px">
================================
        ${shop?.name || 'POS Receipt'}
================================
Order: #${lastOrder.orderId}
Date:  ${new Date().toLocaleString('en-IN')}
--------------------------------
${items}
--------------------------------
TOTAL: ₹${lastOrder.total}
Payment: ${payment.toUpperCase()}
================================
     Thank you! Come again
     Powered by Souqly
================================
</pre>`);
    w.print();
    w.close();
  };

  return (
    <div style={{ minHeight: '100vh', background: S.bg, display: 'flex', fontFamily: 'Inter,sans-serif' }}>
      <Sidebar />

      {/* ── LEFT: Product Grid ── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', maxHeight: '100vh' }}>

        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: S.white }}>Point of Sale</h1>
            <p style={{ fontSize: 12, color: S.g2, marginTop: 2 }}>Counter sales — same inventory as online store</p>
          </div>
          {lastOrder && (
            <button onClick={printReceipt} style={{ marginLeft: 'auto', padding: '8px 16px', background: S.s2, color: S.g1, border: `1px solid ${S.border}`, borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>
              🖨️ Print Last Receipt #{lastOrder.orderId}
            </button>
          )}
        </div>

        {/* Toast */}
        {toast.show && (
          <div style={{ margin: '12px 20px 0', padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, background: toast.ok ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${toast.ok ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`, color: toast.ok ? '#4ade80' : '#f87171' }}>
            {toast.msg}
          </div>
        )}

        {/* Search */}
        <div style={{ padding: '12px 20px', flexShrink: 0 }}>
          <input
            ref={searchRef}
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Search products by name..."
            style={{ width: '100%', background: S.s2, border: `1px solid ${S.border}`, borderRadius: 10, padding: '10px 14px', fontSize: 14, color: S.white, outline: 'none', fontFamily: 'Inter,sans-serif', boxSizing: 'border-box' }}
          />
        </div>

        {/* Product Grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, alignContent: 'start' }}>
          {filtered.map(p => {
            const qty = cart[p._id] || 0;
            return (
              <div
                key={p._id}
                onClick={() => addToCart(p)}
                style={{
                  background: qty > 0 ? `rgba(255,107,53,0.08)` : S.surface,
                  border: `2px solid ${qty > 0 ? S.orange : S.border}`,
                  borderRadius: 12, padding: 12, cursor: 'pointer',
                  transition: 'all 0.15s', position: 'relative',
                }}
              >
                {qty > 0 && (
                  <div style={{ position: 'absolute', top: 8, right: 8, width: 22, height: 22, background: S.orange, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fff' }}>
                    {qty}
                  </div>
                )}
                <div style={{ height: 60, background: S.s2, borderRadius: 8, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, overflow: 'hidden' }}>
                  {p.image ? <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} /> : '🛍️'}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: S.white, lineHeight: 1.3, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: S.orange }}>₹{p.price}</div>
                {p.unit && <div style={{ fontSize: 10, color: S.g2, marginTop: 2 }}>{p.unit}</div>}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px 0', color: S.g2 }}>
              {search ? `No products matching "${search}"` : 'No products found'}
            </div>
          )}
        </div>
      </main>

      {/* ── RIGHT: Cart & Checkout ── */}
      <aside style={{ width: 320, borderLeft: `1px solid ${S.border}`, display: 'flex', flexDirection: 'column', background: S.surface, maxHeight: '100vh' }}>

        {/* Cart Header */}
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: S.white }}>🛒 Cart {cartCount > 0 && `(${cartCount})`}</div>
          {cartCount > 0 && (
            <button onClick={clearCart} style={{ fontSize: 11, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>Clear</button>
          )}
        </div>

        {/* Cart Items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {cartItems.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: S.g2, fontSize: 13 }}>Tap a product to add it to the cart</div>
          ) : (
            cartItems.map(p => (
              <div key={p._id} style={{ padding: '10px 20px', borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: S.white, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: S.g2 }}>₹{p.price} each</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => setQty(p._id, cart[p._id] - 1)} style={{ width: 26, height: 26, borderRadius: 6, background: S.s2, border: `1px solid ${S.border}`, color: S.white, fontWeight: 700, cursor: 'pointer', fontSize: 14, fontFamily: 'Inter,sans-serif' }}>−</button>
                  <span style={{ width: 24, textAlign: 'center', fontSize: 13, fontWeight: 700, color: S.white }}>{cart[p._id]}</span>
                  <button onClick={() => setQty(p._id, cart[p._id] + 1)} style={{ width: 26, height: 26, borderRadius: 6, background: S.orange, border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14, fontFamily: 'Inter,sans-serif' }}>+</button>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: S.orange, width: 50, textAlign: 'right', flexShrink: 0 }}>₹{p.price * cart[p._id]}</div>
              </div>
            ))
          )}
        </div>

        {/* Customer Info */}
        <div style={{ padding: '12px 20px', borderTop: `1px solid ${S.border}` }}>
          <input
            value={customer}
            onChange={e => setCustomer(e.target.value)}
            placeholder="Customer name (optional)"
            style={{ width: '100%', background: S.s2, border: `1px solid ${S.border}`, borderRadius: 8, padding: '8px 12px', fontSize: 12, color: S.white, outline: 'none', fontFamily: 'Inter,sans-serif', marginBottom: 8, boxSizing: 'border-box' }}
          />
          <input
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="Phone number (optional)"
            style={{ width: '100%', background: S.s2, border: `1px solid ${S.border}`, borderRadius: 8, padding: '8px 12px', fontSize: 12, color: S.white, outline: 'none', fontFamily: 'Inter,sans-serif', boxSizing: 'border-box' }}
          />
        </div>

        {/* Payment Method */}
        <div style={{ padding: '12px 20px', borderTop: `1px solid ${S.border}` }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: S.g2, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Payment</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {PAYMENT_METHODS.map(m => (
              <button
                key={m.key}
                onClick={() => setPayment(m.key)}
                style={{
                  padding: '8px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  background: payment === m.key ? `rgba(255,107,53,0.15)` : S.s2,
                  border: `1px solid ${payment === m.key ? S.orange : S.border}`,
                  color: payment === m.key ? S.orange : S.g1,
                  cursor: 'pointer', fontFamily: 'Inter,sans-serif',
                }}
              >
                {m.icon} {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Total + Place Order */}
        <div style={{ padding: '16px 20px', borderTop: `1px solid ${S.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 14, color: S.g1 }}>Total</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: S.white }}>₹{subtotal}</span>
          </div>
          <button
            onClick={placeOrder}
            disabled={placing || cartItems.length === 0}
            style={{
              width: '100%', padding: '14px', borderRadius: 10,
              background: cartItems.length > 0 ? S.orange : S.s2,
              color: cartItems.length > 0 ? '#fff' : S.g2,
              border: 'none', fontSize: 15, fontWeight: 800,
              cursor: cartItems.length > 0 ? 'pointer' : 'not-allowed',
              fontFamily: 'Inter,sans-serif', transition: 'all 0.2s',
            }}
          >
            {placing ? 'Placing...' : cartItems.length > 0 ? `Place Order — ₹${subtotal}` : 'Add items to cart'}
          </button>
        </div>
      </aside>
    </div>
  );
}
