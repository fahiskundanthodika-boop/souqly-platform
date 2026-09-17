'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

import { API_URL as API } from '../../../../lib/config';

export default function CheckoutPage() {
  const { shopSlug } = useParams();
  const router = useRouter();

  const [shop, setShop] = useState(null);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState({});
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  const [gettingLocation, setGettingLocation] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState(null); // { discount, couponId, message }
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  // Loyalty points
  const [loyalty, setLoyalty] = useState(null);       // { points, maxDiscount, settings }
  const [pointsApplied, setPointsApplied] = useState(null); // { pointsToRedeem, discount }
  const [redeemingPoints, setRedeemingPoints] = useState(false);

  const [form, setForm] = useState({
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    paymentMethod: 'cod',
    notes: '',
    lat: '',
    lng: ''
  });

  // Load shop + products + cart
  useEffect(() => {
    const saved = localStorage.getItem(`cart_${shopSlug}`);
    if (saved) {
      try { setCart(JSON.parse(saved)); } catch (e) {}
    }

    fetch(`${API}/shop/public/${shopSlug}`)
      .then(r => r.json())
      .then(async d => {
        if (!d.success) { router.push(`/store/${shopSlug}`); return; }
        setShop(d.shop);
        const pRes = await fetch(`${API}/products/public/${d.shop._id}`);
        const pData = await pRes.json();
        if (pData.success) setProducts(pData.products);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    // Load loyalty points if customer is logged in
    const token = localStorage.getItem(`customer_token_${shopSlug}`);
    if (token) {
      fetch(`${API}/customer/loyalty`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => { if (d.success) setLoyalty(d); })
        .catch(() => {});
    }
  }, [shopSlug]);

  // Cart calculations
  const cartItems = products
    .filter(p => cart[p._id] && cart[p._id] > 0)
    .map(p => ({ ...p, qty: cart[p._id], itemTotal: p.price * cart[p._id] }));

  const subtotal = cartItems.reduce((sum, i) => sum + i.itemTotal, 0);
  const isPickup = form.paymentMethod === 'pickup';
  const isFreeDelivery = shop && subtotal >= shop.freeDeliveryAbove;
  const deliveryCharge = (isPickup || isFreeDelivery) ? 0 : (shop?.deliveryCharge || 0);
  const couponDiscount = couponApplied?.discount || 0;
  const pointsDiscount = pointsApplied?.discount || 0;
  const discount = couponDiscount + pointsDiscount;
  const total = subtotal + deliveryCharge - discount;
  const primary = shop?.primaryColor || '#FF6B35';

  const redeemPoints = async () => {
    if (!loyalty || loyalty.points < (loyalty.settings?.minPointsToRedeem || 100)) return;
    setRedeemingPoints(true);
    try {
      const token = localStorage.getItem(`customer_token_${shopSlug}`);
      const res = await fetch(`${API}/customer/redeem-points`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pointsToRedeem: loyalty.points, orderAmount: subtotal })
      });
      const data = await res.json();
      if (!data.success) { alert(data.message); return; }
      setPointsApplied({ pointsToRedeem: data.pointsToRedeem, discount: data.discount, message: data.message });
    } catch { alert('Could not redeem points.'); }
    finally { setRedeemingPoints(false); }
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setApplyingCoupon(true);
    try {
      const res = await fetch(`${API}/coupons/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode.trim(), shopId: shop._id, orderAmount: subtotal })
      });
      const data = await res.json();
      if (!data.success) { alert(data.message); return; }
      setCouponApplied({ discount: data.discount, couponId: data.couponId, message: data.message });
    } catch { alert('Could not apply coupon.'); }
    finally { setApplyingCoupon(false); }
  };

  // If cart is empty redirect back
  useEffect(() => {
    if (!loading && cartItems.length === 0) {
      router.push(`/store/${shopSlug}`);
    }
  }, [loading, cartItems.length]);

  // GPS location button
  const getLocation = () => {
    if (!navigator.geolocation) {
      alert('Location not supported on this browser.');
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm(f => ({
          ...f,
          lat: pos.coords.latitude.toFixed(6),
          lng: pos.coords.longitude.toFixed(6)
        }));
        setGettingLocation(false);
      },
      (err) => {
        alert('Could not get location. Please enter address manually.');
        setGettingLocation(false);
      },
      { timeout: 10000 }
    );
  };

  // Place order
  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.customerName.trim()) { setError('Please enter your name'); return; }
    if (!form.customerPhone.trim()) { setError('Please enter your phone number'); return; }
    if (!isPickup && !form.customerAddress.trim()) { setError('Please enter your delivery address'); return; }
    if (cartItems.length === 0) { setError('Your cart is empty'); return; }

    setPlacing(true);
    try {
      const res = await fetch(`${API}/orders/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopId: shop._id,
          customerName: form.customerName.trim(),
          customerPhone: form.customerPhone.trim(),
          customerAddress: form.customerAddress.trim(),
          customerLocation: form.lat ? { lat: Number(form.lat), lng: Number(form.lng) } : {},
          items: cartItems.map(item => ({
            productId: item._id,
            name: item.name,
            price: item.price,
            qty: item.qty,
            image: item.image || ''
          })),
          paymentMethod: form.paymentMethod,
          notes: form.notes.trim(),
          channel: 'website',
          couponId: couponApplied?.couponId || null,
          discount: discount || 0,
          pointsRedeemed: pointsApplied?.pointsToRedeem || 0
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Could not place order. Please try again.');
        return;
      }

      // Clear cart
      localStorage.removeItem(`cart_${shopSlug}`);

      // Save order details for confirmation page
      localStorage.setItem(`last_order_${shopSlug}`, JSON.stringify(data.order));

      // For online payment — initiate PhonePe and redirect
      if (form.paymentMethod === 'online') {
        const payRes = await fetch(`${API}/payment/phonepe/initiate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: total,
            orderId: data.order._id,
            customerPhone: form.customerPhone.trim(),
            redirectUrl: `${window.location.origin}/store/${shopSlug}/confirmation?orderId=${data.order.orderId}`
          })
        });
        const payData = await payRes.json();
        if (payData.success && payData.data?.redirectUrl) {
          window.location.href = payData.data.redirectUrl;
          return;
        } else {
          setError('Payment gateway error. Please try another payment method.');
          return;
        }
      }

      // Go to confirmation page
      router.push(`/store/${shopSlug}/confirmation?orderId=${data.order.orderId}`);

    } catch (err) {
      setError('Cannot connect to server. Please check your internet.');
    } finally {
      setPlacing(false);
    }
  };

  const paymentMethods = [
    { value: 'cod', label: 'Cash on Delivery', icon: '💵', desc: 'Pay cash when order arrives' },
    { value: 'online', label: 'Pay Online (UPI / Card)', icon: '📱', desc: 'Secure payment via PhonePe', show: shop?.paymentOptions?.onlineEnabled },
    { value: 'card_on_delivery', label: 'Card on Delivery', icon: '💳', desc: 'Pay by card when order arrives', show: shop?.paymentOptions?.cardOnDeliveryEnabled },
    { value: 'pickup', label: 'Pickup at Shop', icon: '🏪', desc: 'Collect from store, no delivery charge' },
    { value: 'bank_transfer', label: 'Bank Transfer', icon: '🏦', desc: `Pay to UPI: ${shop?.paymentOptions?.upiId || 'Contact shop'}` },
  ].filter(m => m.show !== false);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin"
        style={{ borderColor: `${primary}40`, borderTopColor: primary }}></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-32">

      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3 sticky top-0 z-20">
        <Link href={`/store/${shopSlug}/cart`}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 text-gray-600">
          ←
        </Link>
        <div>
          <h1 className="font-bold text-gray-900">Checkout</h1>
          <p className="text-xs text-gray-400">{shop?.name}</p>
        </div>
      </header>

      <form onSubmit={handlePlaceOrder}>
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 text-sm flex gap-2">
              <span>⚠️</span><span>{error}</span>
            </div>
          )}

          {/* ── DELIVERY DETAILS ──────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-lg">👤</span> Your Details
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Full Name *
                </label>
                <input
                  value={form.customerName}
                  onChange={e => setForm({ ...form, customerName: e.target.value })}
                  placeholder="Enter your name"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ '--tw-ring-color': primary }}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={form.customerPhone}
                  onChange={e => setForm({ ...form, customerPhone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2"
                  required
                />
              </div>

              {/* Address — hidden if pickup */}
              {form.paymentMethod !== 'pickup' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Delivery Address *
                  </label>
                  <textarea
                    value={form.customerAddress}
                    onChange={e => setForm({ ...form, customerAddress: e.target.value })}
                    placeholder="House/flat number, street, landmark, area..."
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 resize-none"
                    rows={3}
                    required={form.paymentMethod !== 'pickup'}
                  />

                  {/* GPS button */}
                  <button
                    type="button"
                    onClick={getLocation}
                    disabled={gettingLocation}
                    className="mt-2 flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-xl border-2 transition-colors"
                    style={{ borderColor: primary, color: primary }}
                  >
                    {gettingLocation ? (
                      <>
                        <span className="animate-spin">⏳</span> Getting location...
                      </>
                    ) : (
                      <>
                        📍 Use my GPS location
                      </>
                    )}
                  </button>
                  {form.lat && (
                    <p className="text-xs text-green-600 mt-1">
                      ✓ Location captured ({form.lat}, {form.lng})
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Special Instructions <span className="text-gray-300 font-normal">(optional)</span>
                </label>
                <input
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  placeholder="e.g. Ring the bell, leave at door..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2"
                />
              </div>
            </div>
          </div>

          {/* ── PAYMENT METHOD ────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-lg">💳</span> Payment Method
            </h2>
            <div className="space-y-2">
              {paymentMethods.map(method => (
                <label
                  key={method.value}
                  className="flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all"
                  style={{
                    borderColor: form.paymentMethod === method.value ? primary : '#e5e7eb',
                    backgroundColor: form.paymentMethod === method.value ? `${primary}08` : 'white'
                  }}
                >
                  <input
                    type="radio"
                    name="payment"
                    value={method.value}
                    checked={form.paymentMethod === method.value}
                    onChange={e => setForm({ ...form, paymentMethod: e.target.value })}
                    className="sr-only"
                  />
                  <div
                    className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                    style={{ borderColor: form.paymentMethod === method.value ? primary : '#d1d5db' }}
                  >
                    {form.paymentMethod === method.value && (
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: primary }}></div>
                    )}
                  </div>
                  <span className="text-xl">{method.icon}</span>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">{method.label}</div>
                    <div className="text-xs text-gray-400">{method.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* ── ORDER SUMMARY ─────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-lg">🧾</span> Order Summary
            </h2>

            {/* Items */}
            <div className="space-y-2 mb-4">
              {cartItems.map(item => (
                <div key={item._id} className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-50 rounded-lg overflow-hidden flex-shrink-0">
                    {item.image
                      ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-lg">🛍️</div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{item.name}</div>
                    <div className="text-xs text-gray-400">₹{item.price} × {item.qty}</div>
                  </div>
                  <div className="font-semibold text-gray-900 text-sm">₹{item.itemTotal}</div>
                </div>
              ))}
            </div>

            {/* Coupon Code */}
            <div className="border-t border-gray-100 pt-4">
              {couponApplied ? (
                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-3 py-2.5">
                  <div>
                    <div className="text-sm font-semibold text-green-700">🎉 {couponCode.toUpperCase()} applied!</div>
                    <div className="text-xs text-green-600">{couponApplied.message}</div>
                  </div>
                  <button onClick={() => { setCouponApplied(null); setCouponCode(''); }} className="text-xs text-red-500 font-medium">Remove</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="Coupon code" maxLength={20}
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono uppercase focus:outline-none focus:ring-2" />
                  <button type="button" onClick={applyCoupon} disabled={applyingCoupon || !couponCode.trim()}
                    className="px-4 py-2.5 rounded-xl text-sm font-semibold border-2 disabled:opacity-50"
                    style={{ borderColor: primary, color: primary }}>
                    {applyingCoupon ? '...' : 'Apply'}
                  </button>
                </div>
              )}
            </div>

            {/* Loyalty Points Redemption */}
            {loyalty?.settings?.enabled && loyalty?.points >= (loyalty?.settings?.minPointsToRedeem || 100) && (
              <div className="border-t border-gray-100 pt-4">
                {pointsApplied ? (
                  <div className="flex items-center justify-between bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2.5">
                    <div>
                      <div className="text-sm font-semibold text-yellow-700">⭐ {pointsApplied.pointsToRedeem} points redeemed!</div>
                      <div className="text-xs text-yellow-600">{pointsApplied.message}</div>
                    </div>
                    <button onClick={() => setPointsApplied(null)} className="text-xs text-red-500 font-medium">Remove</button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
                    <div>
                      <div className="text-sm font-semibold text-yellow-800">⭐ You have {loyalty.points} points</div>
                      <div className="text-xs text-yellow-600">Worth up to ₹{loyalty.maxDiscount} off this order</div>
                    </div>
                    <button
                      type="button"
                      onClick={redeemPoints}
                      disabled={redeemingPoints}
                      className="text-sm font-bold px-4 py-2 rounded-xl text-white disabled:opacity-60"
                      style={{ backgroundColor: '#f59e0b' }}
                    >
                      {redeemingPoints ? '...' : 'Redeem'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Bill breakdown */}
            <div className="border-t border-gray-100 pt-3 space-y-2 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span>
                <span>₹{subtotal}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Delivery</span>
                <span className={deliveryCharge === 0 ? 'text-green-600 font-medium' : ''}>
                  {deliveryCharge === 0
                    ? isPickup ? 'Pickup (Free)' : 'FREE 🎉'
                    : `₹${deliveryCharge}`
                  }
                </span>
              </div>
              {couponDiscount > 0 && (
                <div className="flex justify-between text-green-600 font-medium">
                  <span>Coupon Discount</span>
                  <span>-₹{couponDiscount}</span>
                </div>
              )}
              {pointsDiscount > 0 && (
                <div className="flex justify-between text-yellow-600 font-medium">
                  <span>⭐ Points Discount</span>
                  <span>-₹{pointsDiscount}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-gray-900 text-base pt-1 border-t border-gray-100">
                <span>Total to Pay</span>
                <span style={{ color: primary }}>₹{total}</span>
              </div>
            </div>
          </div>

        </div>

        {/* ── STICKY PLACE ORDER BUTTON ─────────────────────── */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4">
          <button
            type="submit"
            disabled={placing}
            className="w-full py-4 rounded-2xl text-white font-bold text-base disabled:opacity-60 transition-all active:scale-95"
            style={{ backgroundColor: primary }}
          >
            {placing ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Placing your order...
              </span>
            ) : (
              `Place Order · ₹${total} →`
            )}
          </button>
          <p className="text-center text-xs text-gray-400 mt-2">
            By placing order you agree to our terms
          </p>
        </div>

      </form>
    </div>
  );
}
