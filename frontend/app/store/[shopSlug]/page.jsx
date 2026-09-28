'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { API_URL as API } from '../../../lib/config';

const CATEGORY_EMOJI = {
  vegetables: '🥦', vegitables: '🥦', vegitabke: '🥦',
  fruits: '🍎', dairy: '🥛', milk: '🥛',
  staples: '🌾', grains: '🌾', rice: '🌾',
  snacks: '🍿', beverages: '🧃', drinks: '🧃',
  meat: '🍗', chicken: '🍗', fish: '🐟',
  bakery: '🍞', bread: '🍞',
  sweets: '🍬', desserts: '🍰',
  personal: '🧴', care: '🧴',
  cleaning: '🧹', household: '🏠',
  default: '🛒',
};

function getCatEmoji(cat) {
  if (!cat) return '🛒';
  const k = cat.toLowerCase();
  for (const [key, val] of Object.entries(CATEGORY_EMOJI)) {
    if (k.includes(key)) return val;
  }
  return '🛒';
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
  const [promotions, setPromotions] = useState([]);
  const searchRef = useRef();

  // Apply active promotions to a product — returns { salePrice, saved, badge, promo }
  function applyPromotion(product) {
    for (const promo of promotions) {
      const t = promo.target;
      const matches =
        t.type === 'all' ||
        (t.type === 'category' && t.category === product.category) ||
        (t.type === 'products' && t.productIds?.includes(product._id));
      if (!matches) continue;

      const d = promo.discount;
      if (d.type === 'percent') {
        const salePrice = Math.round(product.price * (1 - d.value / 100));
        return { salePrice, saved: product.price - salePrice, badge: `${d.value}% OFF`, promo };
      }
      if (d.type === 'flat') {
        const salePrice = Math.max(0, product.price - d.value);
        return { salePrice, saved: d.value, badge: `₹${d.value} OFF`, promo };
      }
      if (d.type === 'bogo') {
        return { salePrice: product.price, saved: 0, badge: `Buy ${d.buyQty} Get ${d.getQty} Free`, promo };
      }
    }
    return null;
  }

  const primaryColor = shop?.primaryColor || '#0c831f';

  useEffect(() => {
    const saved = localStorage.getItem(`cart_${shopSlug}`);
    if (saved) { try { setCart(JSON.parse(saved)); } catch (e) {} }
  }, [shopSlug]);

  const saveCart = useCallback((c) => {
    setCart(c);
    localStorage.setItem(`cart_${shopSlug}`, JSON.stringify(c));
  }, [shopSlug]);

  useEffect(() => {
    fetch(`${API}/shop/public/${shopSlug}`)
      .then(r => r.json())
      .then(d => { if (d.success) setShop(d.shop); else setNotFound(true); })
      .catch(() => setNotFound(true))
      .finally(() => setLoadingShop(false));
    fetch(`${API}/banners/store/${shopSlug}`)
      .then(r => r.json())
      .then(d => { if (d.success) setBanners(d.banners); })
      .catch(() => {});
  }, [shopSlug]);

  // Fetch active promotions once shop is loaded
  useEffect(() => {
    if (!shop?._id) return;
    fetch(`${API}/promotions/active?shopId=${shop._id}`)
      .then(r => r.json())
      .then(d => { if (d.success) setPromotions(d.promotions); })
      .catch(() => {});
  }, [shop]);

  const heroBanners = banners.filter(b => b.type === 'hero');
  useEffect(() => {
    if (heroBanners.length <= 1) return;
    const id = setInterval(() => setHeroIdx(i => (i + 1) % heroBanners.length), 4000);
    return () => clearInterval(id);
  }, [heroBanners.length]);

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
          const cats = [...new Set(d.products.map(p => p.category).filter(Boolean))];
          if (activeCategory === 'all' || !search) setCategories(cats);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingProducts(false));
  }, [shop, search, activeCategory]);

  useEffect(() => {
    document.body.style.background = '#f2f3f7';
    document.body.style.color = '#1a1a1a';
    return () => { document.body.style.background = ''; document.body.style.color = ''; };
  }, []);

  const addToCart = (p) => saveCart({ ...cart, [p._id]: (cart[p._id] || 0) + 1 });
  const removeFromCart = (id) => {
    const c = { ...cart };
    if (c[id] > 1) c[id]--; else delete c[id];
    saveCart(c);
  };

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const cartTotal = products.reduce((sum, p) => sum + ((cart[p._id] || 0) * p.price), 0);

  if (notFound) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center', background: '#f2f3f7' }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>🔍</div>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Store not found</h1>
      <p style={{ color: '#666', fontSize: 14 }}>This store doesn't exist or has been removed.</p>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f2f3f7', fontFamily: "'Inter', -apple-system, sans-serif", paddingBottom: cartCount > 0 ? 100 : 16 }}>

      {/* ── HEADER ── */}
      <header style={{ background: '#fff', position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ padding: '10px 16px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            {/* Location */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 18 }}>📍</span>
              <div>
                {loadingShop ? (
                  <div style={{ width: 80, height: 14, background: '#eee', borderRadius: 6 }} />
                ) : (
                  <>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', lineHeight: 1.2 }}>{shop?.name}</div>
                    <div style={{ fontSize: 11, color: '#888' }}>{shop?.city} · {shop?.deliveryOptions?.ownRiderEnabled ? '🛵 Delivery' : ''}{shop?.deliveryOptions?.selfPickupEnabled ? ' 🏪 Pickup' : ''}</div>
                  </>
                )}
              </div>
            </div>

            {/* Right icons */}
            <div style={{ display: 'flex', gap: 8 }}>
              <Link href={`/store/${shopSlug}/account`} style={{ width: 38, height: 38, background: '#f2f3f7', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, textDecoration: 'none' }}>👤</Link>
              <Link href={`/store/${shopSlug}/cart`} style={{ position: 'relative', width: 38, height: 38, background: '#f2f3f7', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, textDecoration: 'none' }}>
                🛒
                {cartCount > 0 && (
                  <span style={{ position: 'absolute', top: -4, right: -4, background: primaryColor, color: '#fff', fontSize: 10, fontWeight: 700, width: 18, height: 18, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </Link>
            </div>
          </div>

          {/* Search bar */}
          <div style={{ position: 'relative', marginBottom: 10 }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: '#aaa' }}>🔍</span>
            <input
              ref={searchRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={`Search in ${shop?.name || 'store'}...`}
              style={{ width: '100%', background: '#f2f3f7', border: 'none', borderRadius: 12, padding: '10px 12px 10px 38px', fontSize: 14, color: '#1a1a1a', outline: 'none', boxSizing: 'border-box' }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', fontSize: 16, color: '#aaa', cursor: 'pointer' }}>✕</button>
            )}
          </div>
        </div>

        {/* Delivery info strip */}
        {shop && (
          <div style={{ display: 'flex', gap: 16, padding: '6px 16px 8px', borderTop: '1px solid #f2f3f7', overflowX: 'auto' }}>
            <span style={{ fontSize: 11, color: '#555', whiteSpace: 'nowrap' }}>🛵 Delivery ₹{shop.deliveryCharge}</span>
            <span style={{ fontSize: 11, color: '#555', whiteSpace: 'nowrap' }}>🎁 Free above ₹{shop.freeDeliveryAbove}</span>
            {shop.minOrderAmount > 0 && <span style={{ fontSize: 11, color: '#555', whiteSpace: 'nowrap' }}>📦 Min ₹{shop.minOrderAmount}</span>}
          </div>
        )}
      </header>

      {/* ── HERO BANNERS ── */}
      {heroBanners.length > 0 && (
        <div style={{ margin: '12px 12px 0', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ background: heroBanners[heroIdx]?.background || primaryColor, padding: '20px 16px', position: 'relative', minHeight: 110, borderRadius: 16 }}>
            <div style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 56, opacity: 0.2 }}>{heroBanners[heroIdx]?.emoji}</div>
            {heroBanners[heroIdx]?.tag && <span style={{ background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 10px', borderRadius: 20, display: 'inline-block', marginBottom: 6 }}>{heroBanners[heroIdx].tag}</span>}
            <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', lineHeight: 1.2, marginBottom: 4 }}>{heroBanners[heroIdx]?.title}</div>
            {heroBanners[heroIdx]?.subtitle && <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>{heroBanners[heroIdx].subtitle}</div>}
          </div>
          {heroBanners.length > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 4, padding: '6px 0', background: '#fff', borderRadius: '0 0 12px 12px' }}>
              {heroBanners.map((_, i) => (
                <button key={i} onClick={() => setHeroIdx(i)} style={{ width: i === heroIdx ? 16 : 5, height: 5, borderRadius: 3, background: i === heroIdx ? primaryColor : '#ddd', border: 'none', cursor: 'pointer', padding: 0, transition: 'all 0.3s' }} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── CATEGORY CHIPS ── */}
      {categories.length > 0 && (
        <div style={{ padding: '12px 0 0', background: 'transparent' }}>
          <div style={{ display: 'flex', gap: 8, padding: '0 12px', overflowX: 'auto', scrollbarWidth: 'none' }}>
            {['all', ...categories].map(cat => {
              const active = activeCategory === cat;
              return (
                <button key={cat} onClick={() => setActiveCategory(cat)} style={{
                  flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  background: active ? primaryColor : '#fff',
                  border: active ? `2px solid ${primaryColor}` : '2px solid #e8e8e8',
                  borderRadius: 12, padding: '8px 14px', cursor: 'pointer', transition: 'all 0.2s',
                  minWidth: 64,
                }}>
                  <span style={{ fontSize: 20 }}>{cat === 'all' ? '🛍️' : getCatEmoji(cat)}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: active ? '#fff' : '#333', whiteSpace: 'nowrap' }}>{cat === 'all' ? 'All' : cat}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── PRODUCTS ── */}
      <div style={{ padding: '12px 12px 8px' }}>
        {loadingProducts ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', height: 220 }}>
                <div style={{ height: 120, background: '#f0f0f0' }} />
                <div style={{ padding: 10 }}>
                  <div style={{ height: 12, background: '#f0f0f0', borderRadius: 6, marginBottom: 8, width: '70%' }} />
                  <div style={{ height: 10, background: '#f0f0f0', borderRadius: 6, width: '40%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 16px' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>😕</div>
            <p style={{ fontWeight: 600, color: '#444', margin: '0 0 6px' }}>No products found</p>
            <p style={{ color: '#999', fontSize: 13, margin: 0 }}>{search ? `No results for "${search}"` : 'This store has no products yet'}</p>
          </div>
        ) : (
          <ProductSections
            products={products}
            activeCategory={activeCategory}
            cart={cart}
            primary={primaryColor}
            onAdd={addToCart}
            onRemove={removeFromCart}
            applyPromotion={applyPromotion}
          />
        )}
      </div>

      {/* ── STICKY CART BAR ── */}
      {cartCount > 0 && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '12px 16px', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', borderTop: '1px solid #eee', zIndex: 50 }}>
          <Link href={`/store/${shopSlug}/cart`} style={{ textDecoration: 'none' }}>
            <div style={{ background: primaryColor, borderRadius: 14, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 8, padding: '4px 12px', fontSize: 13, fontWeight: 700, color: '#fff' }}>
                {cartCount} {cartCount === 1 ? 'item' : 'items'}
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>View Cart →</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>₹{cartTotal}</span>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}

function ProductSections({ products, activeCategory, cart, primary, onAdd, onRemove, applyPromotion }) {
  const [activeSubcat, setActiveSubcat] = useState({});

  // Group by category
  const grouped = {};
  products.forEach(p => {
    const cat = p.category || 'General';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(p);
  });

  return (
    <>
      {Object.entries(grouped).map(([cat, items]) => {
        // Get unique subcategories in this category
        const subcats = [...new Set(items.map(p => p.subcategory).filter(Boolean))];
        const activeSub = activeSubcat[cat] || 'all';
        const filtered = activeSub === 'all' ? items : items.filter(p => p.subcategory === activeSub);

        return (
          <div key={cat} style={{ marginBottom: 24 }}>
            {/* Category header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 20 }}>{getCatEmoji(cat)}</span>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: '#1a1a1a', margin: 0 }}>{cat}</h2>
              <span style={{ fontSize: 12, color: '#999', marginLeft: 2 }}>({items.length})</span>
            </div>

            {/* Subcategory pills */}
            {subcats.length > 0 && (
              <div style={{ display: 'flex', gap: 6, marginBottom: 10, overflowX: 'auto', scrollbarWidth: 'none' }}>
                {['all', ...subcats].map(sub => {
                  const active = activeSub === sub;
                  return (
                    <button key={sub} onClick={() => setActiveSubcat(s => ({ ...s, [cat]: sub }))} style={{
                      flexShrink: 0, padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                      background: active ? primary : '#fff',
                      color: active ? '#fff' : '#555',
                      border: active ? `1.5px solid ${primary}` : '1.5px solid #e0e0e0',
                    }}>
                      {sub === 'all' ? 'All' : sub}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Products grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {filtered.map(product => (
                <ProductCard
                  key={product._id}
                  product={product}
                  qty={cart[product._id] || 0}
                  primary={primary}
                  promoResult={applyPromotion ? applyPromotion(product) : null}
                  onAdd={() => onAdd(product)}
                  onRemove={() => onRemove(product._id)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}

function ProductCard({ product, qty, primary, onAdd, onRemove, promoResult }) {
  const mrpDiscount = product.mrp && product.mrp > product.price
    ? Math.round(((product.mrp - product.price) / product.mrp) * 100) : 0;

  // Promotion takes priority over MRP discount
  const displayPrice = promoResult ? promoResult.salePrice : product.price;
  const strikePrice  = promoResult ? product.price : (product.mrp && product.mrp > product.price ? product.mrp : null);
  const badge        = promoResult ? promoResult.badge : (mrpDiscount > 0 ? `${mrpDiscount}% OFF` : null);

  return (
    <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', border: promoResult ? '2px solid #fde68a' : '1px solid #f0f0f0', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Image area */}
      <div style={{ position: 'relative', background: '#f7f8fa', height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {product.image
          ? <img src={product.image} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
          : <span style={{ fontSize: 44 }}>{getCatEmoji(product.category)}</span>
        }
        {promoResult && (
          <span style={{ position: 'absolute', top: 8, left: 8, background: '#dc2626', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6 }}>
            🏷️ {promoResult.badge}
          </span>
        )}
        {!promoResult && mrpDiscount > 0 && (
          <span style={{ position: 'absolute', top: 8, left: 8, background: '#256fef', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6 }}>
            {mrpDiscount}% OFF
          </span>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '10px 10px 10px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 11, color: '#999', marginBottom: 2 }}>{product.unit || ''}</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', lineHeight: 1.3, marginBottom: 6, flex: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {product.name}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
          <div>
            <span style={{ fontSize: 15, fontWeight: 800, color: promoResult ? '#dc2626' : '#1a1a1a' }}>₹{displayPrice}</span>
            {strikePrice && (
              <span style={{ fontSize: 11, color: '#bbb', textDecoration: 'line-through', marginLeft: 4 }}>₹{strikePrice}</span>
            )}
          </div>

          {/* Add / qty control */}
          {qty === 0 ? (
            <button onClick={onAdd} style={{ background: '#fff', border: `2px solid ${primary}`, color: primary, borderRadius: 8, padding: '5px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}>
              ADD
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: primary, borderRadius: 8, padding: '3px 6px' }}>
              <button onClick={onRemove} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 18, fontWeight: 700, cursor: 'pointer', lineHeight: 1, padding: '0 2px' }}>−</button>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 13, minWidth: 16, textAlign: 'center' }}>{qty}</span>
              <button onClick={onAdd} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 18, fontWeight: 700, cursor: 'pointer', lineHeight: 1, padding: '0 2px' }}>+</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
