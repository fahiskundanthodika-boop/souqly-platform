// Settings page - shop configuration
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '../../../lib/api';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/auth/me').then(res => setShop(res.data.shop))
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/auth/update', shop);
      toast.success('Settings saved!');
    } catch (err) {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !shop) return <div className="p-12 text-center text-gray-400">Loading settings...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-4 flex items-center gap-3">
        <Link href="/dashboard" className="text-gray-400 hover:text-primary">← Dashboard</Link>
        <span className="text-gray-300">/</span>
        <span className="font-bold text-gray-900">Settings</span>
      </nav>

      <div className="p-6 max-w-2xl">
        <form onSubmit={handleSave} className="space-y-6">

          {/* Basic Info */}
          <div className="card space-y-4">
            <h2 className="font-bold text-gray-900">Store Information</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Store Name</label>
              <input value={shop.name} onChange={e => setShop({...shop, name: e.target.value})}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Owner Name</label>
              <input value={shop.ownerName} onChange={e => setShop({...shop, ownerName: e.target.value})}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Number</label>
              <input placeholder="+91 98765 43210" value={shop.whatsappNumber || ''} onChange={e => setShop({...shop, whatsappNumber: e.target.value})}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GST Number</label>
              <input placeholder="32XXXXX1234Z1ZU" value={shop.gstNumber || ''} onChange={e => setShop({...shop, gstNumber: e.target.value})}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>

          {/* Delivery Settings */}
          <div className="card space-y-4">
            <h2 className="font-bold text-gray-900">Delivery Settings</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Charge (₹)</label>
                <input type="number" value={shop.deliveryCharge || 40} onChange={e => setShop({...shop, deliveryCharge: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Free Delivery Above (₹)</label>
                <input type="number" value={shop.freeDeliveryAbove || 500} onChange={e => setShop({...shop, freeDeliveryAbove: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min Order Amount (₹)</label>
                <input type="number" value={shop.minOrderAmount || 0} onChange={e => setShop({...shop, minOrderAmount: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Delivery Km</label>
                <input type="number" value={shop.maxDeliveryKm || 10} onChange={e => setShop({...shop, maxDeliveryKm: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            </div>
          </div>

          {/* Brand Color */}
          <div className="card space-y-4">
            <h2 className="font-bold text-gray-900">Store Theme</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Brand Color</label>
              <div className="flex items-center gap-3">
                <input type="color" value={shop.primaryColor || '#FF6B35'} onChange={e => setShop({...shop, primaryColor: e.target.value})}
                  className="h-10 w-16 rounded-lg border border-gray-200 cursor-pointer" />
                <span className="text-sm text-gray-500">{shop.primaryColor || '#FF6B35'}</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">UPI ID (for payments)</label>
              <input placeholder="yourname@paytm" value={shop.paymentOptions?.upiId || ''} onChange={e => setShop({...shop, paymentOptions: {...shop.paymentOptions, upiId: e.target.value}})}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>

          {/* Loyalty Points */}
          <div className="card space-y-4">
            <div>
              <h2 className="font-bold text-gray-900">Loyalty Points</h2>
              <p className="text-xs text-gray-400 mt-1">Customers earn points on every order and can redeem them for discounts.</p>
            </div>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm font-medium text-gray-700">Enable Loyalty Points</span>
              <div
                onClick={() => setShop({ ...shop, loyaltySettings: { ...shop.loyaltySettings, enabled: !shop.loyaltySettings?.enabled } })}
                className={`w-12 h-6 rounded-full transition-colors cursor-pointer ${shop.loyaltySettings?.enabled !== false ? 'bg-orange-500' : 'bg-gray-200'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow mt-0.5 transition-transform ${shop.loyaltySettings?.enabled !== false ? 'translate-x-6' : 'translate-x-1'}`} />
              </div>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Points per ₹1 spent</label>
                <input type="number" min="1" max="10"
                  value={shop.loyaltySettings?.pointsPerRupee ?? 1}
                  onChange={e => setShop({ ...shop, loyaltySettings: { ...shop.loyaltySettings, pointsPerRupee: Number(e.target.value) } })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <p className="text-xs text-gray-400 mt-1">e.g. 1 = ₹1 earns 1 point</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Points for ₹1 discount</label>
                <input type="number" min="1"
                  value={shop.loyaltySettings?.redemptionRate ?? 100}
                  onChange={e => setShop({ ...shop, loyaltySettings: { ...shop.loyaltySettings, redemptionRate: Number(e.target.value) } })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <p className="text-xs text-gray-400 mt-1">e.g. 100 = 100 points = ₹1 off</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Min points to redeem</label>
                <input type="number" min="1"
                  value={shop.loyaltySettings?.minPointsToRedeem ?? 100}
                  onChange={e => setShop({ ...shop, loyaltySettings: { ...shop.loyaltySettings, minPointsToRedeem: Number(e.target.value) } })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Max redeem % of order</label>
                <input type="number" min="1" max="100"
                  value={shop.loyaltySettings?.maxRedeemPercent ?? 20}
                  onChange={e => setShop({ ...shop, loyaltySettings: { ...shop.loyaltySettings, maxRedeemPercent: Number(e.target.value) } })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <p className="text-xs text-gray-400 mt-1">e.g. 20 = max 20% of order value</p>
              </div>
            </div>

            <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 text-xs text-orange-700">
              💡 <strong>Default:</strong> ₹1 spent = 1 point · 100 points = ₹1 off · Max 20% of order
            </div>
          </div>

          {/* SMS Notifications */}
          <div className="card space-y-4">
            <div>
              <h2 className="font-bold text-gray-900">SMS Notifications (MSG91)</h2>
              <p className="text-xs text-gray-400 mt-1">
                Customers get SMS when order is placed, confirmed, and delivered.{' '}
                <a href="https://msg91.com" target="_blank" rel="noreferrer" className="text-orange-500 hover:underline">Get your Auth Key at msg91.com →</a>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">MSG91 Auth Key</label>
              <input
                type="password"
                placeholder="Paste your MSG91 Auth Key here"
                value={shop.smsSettings?.msg91AuthKey || ''}
                onChange={e => setShop({ ...shop, smsSettings: { ...shop.smsSettings, msg91AuthKey: e.target.value } })}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
              />
              <p className="text-xs text-gray-400 mt-1">Found in MSG91 → API → Auth Key</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sender ID (6 letters, approved by DLT)</label>
              <input
                placeholder="SOUQLY"
                maxLength={6}
                value={shop.smsSettings?.senderId || ''}
                onChange={e => setShop({ ...shop, smsSettings: { ...shop.smsSettings, senderId: e.target.value.toUpperCase() } })}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 uppercase"
              />
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-xs text-orange-700 space-y-1">
              <div className="font-semibold mb-2">📋 Setup steps:</div>
              <div>1. Register at msg91.com and add credits</div>
              <div>2. Go to <strong>DLT Registration</strong> → register your entity and templates</div>
              <div>3. Create SMS templates for: order placed, confirmed, packed, out for delivery, delivered, cancelled, OTP</div>
              <div>4. Paste Auth Key above and save</div>
              <div>5. Paste each Template ID in your backend <code>.env</code> file (MSG91_TPL_*)</div>
            </div>
          </div>

          <button type="submit" disabled={saving} className="btn-primary w-full text-center disabled:opacity-60">
            {saving ? 'Saving...' : 'Save All Settings'}
          </button>

        </form>
      </div>
    </div>
  );
}
