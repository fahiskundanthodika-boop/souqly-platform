'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

import { API_URL as API } from '../../../../lib/config';

export default function CartPage() {
  const { shopSlug } = useParams();
  const router = useRouter();
  const [shop, setShop] = useState(null);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState({});
  const [loading, setLoading] = useState(true);

  // Load cart from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`cart_${shopSlug}`);
    if (saved) {
      try { setCart(JSON.parse(saved)); } catch (e) {}
    }
  }, [shopSlug]);

  // Load shop + products
  useEffect(() => {
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
  }, [shopSlug]);

  const saveCart = useCallback((newCart) => {
    setCart(newCart);
    localStorage.setItem(`cart_${shopSlug}`, JSON.stringify(newCart));
  }, [shopSlug]);

  const add = (productId) => {
    saveCart({ ...cart, [productId]: (cart[productId] || 0) + 1 });
  };

  const remove = (productId) => {
    const newCart = { ...cart };
    if (newCart[productId] > 1) newCart[productId]--;
    else delete newCart[productId];
    saveCart(newCart);
  };

  const removeAll = (productId) => {
    const newCart = { ...cart };
    delete newCart[productId];
    saveCart(newCart);
  };

  // Only show products that are in cart
  const cartItems = products
    .filter(p => cart[p._id] && cart[p._id] > 0)
    .map(p => ({ ...p, qty: cart[p._id], itemTotal: p.price * cart[p._id] }));

  const subtotal = cartItems.reduce((sum, i) => sum + i.itemTotal, 0);
  const isFreeDelivery = shop && subtotal >= shop.freeDeliveryAbove;
  const deliveryCharge = isFreeDelivery ? 0 : (shop?.deliveryCharge || 0);
  const total = subtotal + deliveryCharge;
  const amountForFreeDelivery = shop ? shop.freeDeliveryAbove - subtotal : 0;

  const primary = shop?.primaryColor || '#FF6B35';

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin"
        style={{ borderColor: `${primary}40`, borderTopColor: primary }}></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3">
        <Link href={`/store/${shopSlug}`}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
          ←
        </Link>
        <div>
          <h1 className="font-bold text-gray-900">Your Cart</h1>
          <p className="text-xs text-gray-400">{shop?.name}</p>
        </div>
        <span className="ml-auto text-sm text-gray-400">{cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}</span>
      </header>

      {cartItems.length === 0 ? (
        // Empty cart
        <div className="flex flex-col items-center justify-center min-h-[70vh] px-8 text-center">
          <div className="text-7xl mb-5">🛒</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
          <p className="text-gray-400 text-sm mb-8">Add items from the store to get started</p>
          <Link href={`/store/${shopSlug}`}
            className="px-8 py-3.5 rounded-2xl text-white font-bold text-sm"
            style={{ backgroundColor: primary }}>
            ← Browse Products
          </Link>
        </div>
      ) : (
        <div className="pb-48">

          {/* Free delivery progress bar */}
          {shop && !isFreeDelivery && amountForFreeDelivery > 0 && (
            <div className="mx-4 mt-4 bg-white rounded-2xl p-4 border border-dashed"
              style={{ borderColor: primary }}>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-medium" style={{ color: primary }}>
                  🎁 Add ₹{amountForFreeDelivery} more for FREE delivery!
                </span>
                <span className="text-gray-400">₹{shop.freeDeliveryAbove} target</span>
              </div>
              <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className="h-2 rounded-full transition-all duration-500"
                  style={{
                    backgroundColor: primary,
                    width: `${Math.min((subtotal / shop.freeDeliveryAbove) * 100, 100)}%`
                  }}
                />
              </div>
            </div>
          )}

          {isFreeDelivery && (
            <div className="mx-4 mt-4 bg-green-50 border border-green-200 rounded-2xl p-3 text-center">
              <span className="text-green-700 text-sm font-semibold">🎉 You got FREE delivery!</span>
            </div>
          )}

          {/* Cart items */}
          <div className="mx-4 mt-4 bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {cartItems.map((item, index) => (
              <div key={item._id}>
                <div className="flex items-center gap-3 p-4">
                  {/* Product image */}
                  <div className="w-16 h-16 bg-gray-50 rounded-xl overflow-hidden flex-shrink-0">
                    {item.image
                      ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-2xl">🛍️</div>
                    }
                  </div>

                  {/* Name + price */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm leading-tight truncate">{item.name}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{item.unit}</p>
                    <p className="text-sm font-bold mt-1" style={{ color: primary }}>₹{item.price}</p>
                  </div>

                  {/* Qty controls */}
                  <div className="flex flex-col items-end gap-2">
                    <button onClick={() => removeAll(item._id)}
                      className="text-xs text-gray-300 hover:text-red-400 transition-colors">
                      Remove
                    </button>
                    <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-1 py-1">
                      <button onClick={() => remove(item._id)}
                        className="w-7 h-7 rounded-lg text-white font-bold flex items-center justify-center text-base"
                        style={{ backgroundColor: primary }}>
                        −
                      </button>
                      <span className="font-bold text-gray-900 text-sm w-5 text-center">{item.qty}</span>
                      <button onClick={() => add(item._id)}
                        className="w-7 h-7 rounded-lg text-white font-bold flex items-center justify-center text-base"
                        style={{ backgroundColor: primary }}>
                        +
                      </button>
                    </div>
                    <span className="text-sm font-bold text-gray-700">₹{item.itemTotal}</span>
                  </div>
                </div>
                {index < cartItems.length - 1 && <div className="border-b border-gray-50 mx-4"></div>}
              </div>
            ))}
          </div>

          {/* Bill Summary */}
          <div className="mx-4 mt-4 bg-white rounded-2xl border border-gray-100 p-4">
            <h3 className="font-bold text-gray-900 mb-3">Bill Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal ({cartItems.reduce((a, b) => a + b.qty, 0)} items)</span>
                <span>₹{subtotal}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Delivery charge</span>
                <span className={isFreeDelivery ? 'text-green-600 font-medium' : ''}>
                  {isFreeDelivery ? 'FREE 🎉' : `₹${deliveryCharge}`}
                </span>
              </div>
              <div className="border-t border-gray-100 pt-2 flex justify-between font-bold text-gray-900 text-base">
                <span>Total</span>
                <span style={{ color: primary }}>₹{total}</span>
              </div>
            </div>
          </div>

          {/* Add more items button */}
          <div className="mx-4 mt-3">
            <Link href={`/store/${shopSlug}`}
              className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-medium transition-colors"
              style={{ borderColor: primary, color: primary }}>
              + Add More Items
            </Link>
          </div>
        </div>
      )}

      {/* Sticky Checkout Buttons */}
      {cartItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 space-y-2">

          {/* WhatsApp Order Button */}
          {shop?.whatsappNumber && (
            <a
              href={(() => {
                const num = shop.whatsappNumber.replace(/\D/g, '');
                const lines = [
                  `Hi ${shop.name}! I'd like to place an order:`,
                  '',
                  ...cartItems.map(i => `• ${i.name} x${i.qty} — ₹${i.itemTotal}`),
                  '',
                  `Subtotal: ₹${subtotal}`,
                  deliveryCharge > 0 ? `Delivery: ₹${deliveryCharge}` : `Delivery: FREE`,
                  `*Total: ₹${total}*`,
                  '',
                  `Please confirm my order. Thank you!`
                ];
                return `https://wa.me/${num}?text=${encodeURIComponent(lines.join('\n'))}`;
              })()}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-white font-bold text-sm"
              style={{ backgroundColor: '#25D366' }}>
              💬 Order via WhatsApp
            </a>
          )}

          {/* Regular Checkout */}
          <Link href={`/store/${shopSlug}/checkout`}>
            <div className="flex items-center justify-between px-6 py-4 rounded-2xl text-white font-bold shadow-lg"
              style={{ backgroundColor: primary }}>
              <span className="text-sm">{cartItems.reduce((a, b) => a + b.qty, 0)} items</span>
              <span>Checkout Online →</span>
              <span className="text-sm">₹{total}</span>
            </div>
          </Link>
        </div>
      )}

    </div>
  );
}
