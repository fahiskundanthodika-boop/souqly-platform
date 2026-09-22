'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

import { API_URL as API } from '../../../lib/config';
import { getThemeColors } from '../../../lib/themes';

// ── Skeleton loader shown while products are loading ──────────────
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden animate-pulse">
      <div className="bg-gray-200 h-36"></div>
      <div className="p-3 space-y-2">
        <div className="bg-gray-200 h-3 rounded w-3/4"></div>
        <div className="bg-gray-200 h-3 rounded w-1/2"></div>
        <div className="bg-gray-200 h-6 rounded w-1/3 mt-2"></div>
        <div className="bg-gray-200 h-8 rounded-xl w-full mt-2"></div>
      </div>
    </div>
  );
}

function SkeletonHeader() {
  return (
    <div className="animate-pulse px-4 py-5 flex items-center gap-4">
      <div className="w-16 h-16 bg-white/30 rounded-2xl"></div>
      <div className="space-y-2">
        <div className="bg-white/30 h-5 w-36 rounded"></div>
        <div className="bg-white/20 h-3 w-24 rounded"></div>
      </div>
    </div>
  );
}

function useCountdown(endDate, endTime) {
  const [remaining, setRemaining] = useState('');
  useEffect(() => {
    if (!endDate) return;
    const target = new Date(`${endDate}T${endTime || '23:59'}`);
    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) { setRemaining('Ended'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${h}h ${m}m ${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endDate, endTime]);
  return remaining;
}

export default function StorePage() {
  const { shopSlug } = useParams();
  const [shop, setShop] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cart, setCart] = useState({});
  const [loadingShop, setLoadingShop] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [notFound, setNotFound] = useState(false);
  const [banners, setBanners] = useState([]);
  const [heroIdx, setHeroIdx] = useState(0);
  const [themeData, setThemeData] = useState(null);

  // Load cart from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`cart_${shopSlug}`);
    if (saved) {
      try { setCart(JSON.parse(saved)); } catch (e) {}
    }
  }, [shopSlug]);

  // Save cart to localStorage whenever it changes
  const saveCart = useCallback((newCart) => {
    setCart(newCart);
    localStorage.setItem(`cart_${shopSlug}`, JSON.stringify(newCart));
  }, [shopSlug]);

  // Fetch shop details + banners
  useEffect(() => {
    fetch(`${API}/shop/public/${shopSlug}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setShop(d.shop);
        else setNotFound(true);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoadingShop(false));

    fetch(`${API}/banners/store/${shopSlug}`)
      .then(r => r.json())
      .then(d => { if (d.success) setBanners(d.banners); })
      .catch(() => {});

    fetch(`${API}/theme/store/${shopSlug}`)
      .then(r => r.json())
      .then(d => { if (d.success) setThemeData(d.theme); })
      .catch(() => {});
  }, [shopSlug]);

  // Hero auto-advance
  const heroBanners = banners.filter(b => b.type === 'hero');
  const miniBanners = banners.filter(b => b.type === 'mini');
  const flashBanner = banners.find(b => b.type === 'flash');
  useEffect(() => {
    if (heroBanners.length <= 1) return;
    const id = setInterval(() => setHeroIdx(i => (i + 1) % heroBanners.length), 4000);
    return () => clearInterval(id);
  }, [heroBanners.length]);

  // Fetch products once shop is loaded
  useEffect(() => {
    if (!shop) return;
    setLoadingProducts(true);

    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (activeCategory !== 'all') params.set('category', activeCategory);

    fetch(`${API}/products/public/${shop._id}?${params}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setProducts(d.products);
          // Build category list from products
          const cats = [...new Set(d.products.map(p => p.category).filter(Boolean))];
          setCategories(cats);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingProducts(false));
  }, [shop, search, activeCategory]);

  // Add one item to cart
  const addToCart = (product) => {
    const newCart = { ...cart, [product._id]: (cart[product._id] || 0) + 1 };
    saveCart(newCart);
  };

  // Remove one item from cart
  const removeFromCart = (productId) => {
    const newCart = { ...cart };
    if (newCart[productId] > 1) newCart[productId]--;
    else delete newCart[productId];
    saveCart(newCart);
  };

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const cartTotal = products.reduce((sum, p) => sum + ((cart[p._id] || 0) * p.price), 0);

  // Resolve theme: DB theme → themeColors overrides → fallback to primaryColor
  const T = getThemeColors(themeData?.theme || 'classic-white', themeData?.themeColors || {});
  const primary = T.primary || shop?.primaryColor || '#FF6B35';

  // ── Not found ──────────────────────────────────────────────────
  if (notFound) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
      <div className="text-6xl mb-4">🔍</div>
      <h1 className="text-xl font-bold text-gray-900 mb-2">Store not found</h1>
      <p className="text-gray-400 text-sm">The store link you followed doesn't exist or has been removed.</p>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: T.background, color: T.text }}>

      {/* ── HEADER ──────────────────────────────────────────────── */}
      <header style={{ backgroundColor: primary }} className="sticky top-0 z-30 shadow-sm">
        {loadingShop ? <SkeletonHeader /> : (
          <div className="px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Shop logo or initial */}
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
                  {shop?.logo
                    ? <img src={shop.logo} alt={shop.name} className="w-full h-full object-cover" />
                    : <span className="text-white font-bold text-xl">{shop?.name?.charAt(0)}</span>
                  }
                </div>
                <div>
                  <h1 className="text-white font-bold text-base leading-tight">{shop?.name}</h1>
                  <p className="text-white/70 text-xs">
                    {shop?.city} · {shop?.deliveryOptions?.selfPickupEnabled ? '🏪 Pickup · ' : ''}
                    {shop?.deliveryOptions?.ownRiderEnabled ? '🛵 Delivery' : ''}
                    {shop?.avgRating > 0 && ` · ⭐ ${shop.avgRating} (${shop.totalReviews})`}
                  </p>
                </div>
              </div>

              {/* Account icon */}
              <Link href={`/store/${shopSlug}/account`} className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white text-xl mr-1">
                👤
              </Link>

              {/* Cart icon */}
              <Link href={`/store/${shopSlug}/cart`} className="relative">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white text-xl">
                  🛒
                </div>
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ color: primary }}>
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </Link>
            </div>

            {/* Search bar */}
            <div className="mt-3 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search products..."
                className="w-full bg-white rounded-xl pl-9 pr-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-white/50"
              />
            </div>
          </div>
        )}
      </header>

      {/* ── FLASH SALE STRIP ───────────────────────────────────── */}
      {flashBanner && <FlashStrip banner={flashBanner} />}

      {/* ── HERO SLIDER ─────────────────────────────────────────── */}
      {heroBanners.length > 0 && (
        <div style={{ position: 'relative', overflow: 'hidden', margin: '0 0 0 0' }}>
          <div style={{ background: heroBanners[heroIdx]?.background, padding: '20px 16px', minHeight: 120, position: 'relative', overflow: 'hidden', transition: 'background 0.4s' }}>
            <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 52, opacity: 0.18 }}>{heroBanners[heroIdx]?.emoji}</div>
            {heroBanners[heroIdx]?.tag && (
              <span style={{ display: 'inline-block', background: heroBanners[heroIdx].tagColor, color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 10px', borderRadius: 20, marginBottom: 6 }}>{heroBanners[heroIdx].tag}</span>
            )}
            <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', lineHeight: 1.2, marginBottom: 4 }}>{heroBanners[heroIdx]?.title}</div>
            {heroBanners[heroIdx]?.subtitle && <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>{heroBanners[heroIdx].subtitle}</div>}
            <button style={{ marginTop: 12, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', borderRadius: 8, padding: '7px 16px', fontSize: 12, fontWeight: 600 }}
              onClick={() => { if (heroBanners[heroIdx]?.linkTo && heroBanners[heroIdx].linkTo !== 'all') {} }}>
              {heroBanners[heroIdx]?.buttonText}
            </button>
          </div>
          {heroBanners.length > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 5, padding: '8px 0', background: '#fff' }}>
              {heroBanners.map((_, i) => (
                <button key={i} onClick={() => setHeroIdx(i)} style={{ width: i === heroIdx ? 18 : 6, height: 6, borderRadius: 3, background: i === heroIdx ? (shop?.primaryColor || '#FF6B35') : '#ddd', border: 'none', cursor: 'pointer', transition: 'all 0.3s', padding: 0 }} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MINI BANNERS ────────────────────────────────────────── */}
      {miniBanners.length > 0 && (
        <div style={{ display: 'flex', gap: 10, padding: '10px 12px', overflowX: 'auto', background: '#fff', borderBottom: '1px solid #f3f4f6' }}>
          {miniBanners.map(b => (
            <div key={b._id} style={{ flexShrink: 0, width: 150, background: b.background, borderRadius: 10, padding: '12px 12px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', right: 6, bottom: 6, fontSize: 24, opacity: 0.2 }}>{b.emoji}</div>
              {b.tag && <span style={{ display: 'inline-block', background: b.tagColor, color: '#fff', fontSize: 9, fontWeight: 700, padding: '1px 7px', borderRadius: 20, marginBottom: 4 }}>{b.tag}</span>}
              <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>{b.title}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── DELIVERY INFO BANNER ────────────────────────────────── */}
      {shop && (
        <div className="bg-white border-b border-gray-100 px-4 py-2 flex items-center gap-4 text-xs text-gray-500 overflow-x-auto">
          <span className="whitespace-nowrap">🛵 Delivery ₹{shop.deliveryCharge}</span>
          <span className="whitespace-nowrap">🎁 Free above ₹{shop.freeDeliveryAbove}</span>
          {shop.minOrderAmount > 0 && <span className="whitespace-nowrap">📦 Min order ₹{shop.minOrderAmount}</span>}
        </div>
      )}

      {/* ── CATEGORY TABS ───────────────────────────────────────── */}
      {categories.length > 0 && (
        <div className="bg-white border-b border-gray-100 px-4 py-2 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {['all', ...categories].map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className="px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all"
                style={
                  activeCategory === cat
                    ? { backgroundColor: primary, color: 'white' }
                    : { backgroundColor: '#f3f4f6', color: '#555' }
                }
              >
                {cat === 'all' ? 'All' : cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── PRODUCTS GRID ───────────────────────────────────────── */}
      <div className="p-4 pb-36">
        {loadingProducts ? (
          // Skeleton grid
          <div className="grid grid-cols-2 gap-3">
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">😕</div>
            <p className="font-medium text-gray-700">No products found</p>
            <p className="text-gray-400 text-sm mt-1">
              {search ? `No results for "${search}"` : 'This store has no products yet'}
            </p>
            {search && (
              <button onClick={() => setSearch('')}
                className="mt-4 text-sm font-medium px-4 py-2 rounded-xl border-2"
                style={{ borderColor: primary, color: primary }}>
                Clear search
              </button>
            )}
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-400 mb-3">{products.length} products</p>
            <div className="grid grid-cols-2 gap-3">
              {products.map(product => (
                <ProductCard
                  key={product._id}
                  product={product}
                  qty={cart[product._id] || 0}
                  primary={primary}
                  onAdd={() => addToCart(product)}
                  onRemove={() => removeFromCart(product._id)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── STICKY CART BAR ─────────────────────────────────────── */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-3 bg-white border-t border-gray-100 shadow-lg z-20">
          <Link href={`/store/${shopSlug}/cart`}>
            <div
              className="flex items-center justify-between px-5 py-3.5 rounded-2xl text-white font-bold shadow-lg"
              style={{ backgroundColor: primary }}
            >
              <div className="bg-white/20 px-3 py-1 rounded-full text-sm">
                {cartCount} {cartCount === 1 ? 'item' : 'items'}
              </div>
              <span className="text-sm">View Cart →</span>
              <span className="text-sm">₹{cartTotal}</span>
            </div>
          </Link>
        </div>
      )}

    </div>
  );
}

// ── Flash Sale Strip ───────────────────────────────────────────────
function FlashStrip({ banner }) {
  const remaining = useCountdown(
    banner.flashEndDate ? banner.flashEndDate.slice(0, 10) : null,
    banner.flashEndTime
  );
  if (!remaining || remaining === 'Ended') return null;
  return (
    <div style={{ background: banner.background || 'linear-gradient(90deg,#7c3aed,#db2777)', padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 16 }}>{banner.emoji}</span>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{banner.title}</div>
          {banner.subtitle && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)' }}>{banner.subtitle}</div>}
        </div>
      </div>
      <div style={{ background: 'rgba(0,0,0,0.3)', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>
        ⏱ {remaining}
      </div>
    </div>
  );
}

// ── Product Card Component ─────────────────────────────────────────
function ProductCard({ product, qty, primary, onAdd, onRemove }) {
  const discount = product.mrp && product.mrp > product.price
    ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
    : 0;

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
      {/* Image */}
      <div className="relative bg-gray-50 h-36">
        {product.image
          ? <img src={product.image} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
          : (
            <div className="w-full h-full flex items-center justify-center text-4xl">
              🛍️
            </div>
          )
        }
        {/* Discount badge */}
        {discount > 0 && (
          <span className="absolute top-2 left-2 text-white text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: primary }}>
            {discount}% off
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-2.5">
        <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2 min-h-[2.5rem]">
          {product.name}
        </h3>
        <p className="text-gray-400 text-xs mt-0.5">{product.unit}</p>

        {/* Price */}
        <div className="flex items-center gap-1.5 mt-1.5">
          <span className="font-bold text-sm" style={{ color: primary }}>₹{product.price}</span>
          {product.mrp && product.mrp > product.price && (
            <span className="text-gray-400 line-through text-xs">₹{product.mrp}</span>
          )}
        </div>

        {/* Add to cart / qty control */}
        <div className="mt-2">
          {qty === 0 ? (
            <button
              onClick={onAdd}
              className="w-full py-2 rounded-xl text-white text-sm font-semibold active:scale-95 transition-transform"
              style={{ backgroundColor: primary }}
            >
              Add +
            </button>
          ) : (
            <div className="flex items-center justify-between bg-gray-50 rounded-xl px-1 py-1">
              <button
                onClick={onRemove}
                className="w-8 h-8 rounded-lg text-white font-bold flex items-center justify-center text-lg active:scale-90 transition-transform"
                style={{ backgroundColor: primary }}
              >
                −
              </button>
              <span className="font-bold text-gray-900 text-sm">{qty}</span>
              <button
                onClick={onAdd}
                className="w-8 h-8 rounded-lg text-white font-bold flex items-center justify-center text-lg active:scale-90 transition-transform"
                style={{ backgroundColor: primary }}
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
