// Marketing page - WhatsApp broadcast campaigns
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '../../../lib/api';
import toast from 'react-hot-toast';

export default function MarketingPage() {
  const [broadcasts, setBroadcasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [sending, setSending] = useState(null);
  const [form, setForm] = useState({
    message: '', targetAudience: 'all', scheduledAt: ''
  });

  const fetchBroadcasts = async () => {
    try {
      const res = await api.get('/broadcast');
      setBroadcasts(res.data.broadcasts);
    } catch (err) {
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBroadcasts(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/broadcast', form);
      toast.success('Campaign created!');
      setShowForm(false);
      setForm({ message: '', targetAudience: 'all', scheduledAt: '' });
      fetchBroadcasts();
    } catch (err) {
      toast.error('Failed to create campaign');
    }
  };

  const handleSend = async (broadcastId) => {
    if (!confirm('Send this WhatsApp message to all selected customers now?')) return;
    setSending(broadcastId);
    try {
      const res = await api.post(`/broadcast/${broadcastId}/send`);
      toast.success(res.data.message);
      fetchBroadcasts();
    } catch (err) {
      toast.error('Failed to send');
    } finally {
      setSending(null);
    }
  };

  const statusColors = { draft: 'bg-gray-100 text-gray-600', scheduled: 'bg-blue-100 text-blue-700', sending: 'bg-yellow-100 text-yellow-700', sent: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700' };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-gray-400 hover:text-primary">← Dashboard</Link>
          <span className="text-gray-300">/</span>
          <span className="font-bold text-gray-900">Marketing</span>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary text-sm py-2 px-4">
          + New Campaign
        </button>
      </nav>

      <div className="p-6">
        {showForm && (
          <div className="card mb-6">
            <h2 className="font-bold text-gray-900 mb-4">Create WhatsApp Campaign</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
                <textarea
                  placeholder="Type your WhatsApp message here... 🎉 Special offer! Get 20% off on all orders today. Shop now at your store link!"
                  value={form.message}
                  onChange={e => setForm({...form, message: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  rows={4} required
                />
                <p className="text-xs text-gray-400 mt-1">{form.message.length} characters</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Send To</label>
                <select value={form.targetAudience} onChange={e => setForm({...form, targetAudience: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                  <option value="all">All Customers</option>
                  <option value="active">Active Customers (ordered in last 30 days)</option>
                  <option value="inactive">Inactive Customers</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button type="submit" className="btn-primary">Save Campaign</button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-outline">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {loading ? <div className="text-center py-12 text-gray-400">Loading campaigns...</div> : broadcasts.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-5xl mb-3">📣</div>
            <p>No campaigns yet. Create your first WhatsApp broadcast!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {broadcasts.map(b => (
              <div key={b._id} className="card">
                <div className="flex items-start justify-between mb-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[b.status]}`}>{b.status}</span>
                  <span className="text-xs text-gray-400">{new Date(b.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-gray-700 mb-3 bg-gray-50 rounded-xl p-3">{b.message}</p>
                <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                  <span>👥 {b.totalRecipients} recipients</span>
                  <span>✅ {b.delivered} delivered</span>
                  <span>❌ {b.failed} failed</span>
                  <span>🎯 Audience: {b.targetAudience}</span>
                </div>
                {b.status === 'draft' && (
                  <button
                    onClick={() => handleSend(b._id)}
                    disabled={sending === b._id}
                    className="btn-primary text-sm py-2"
                  >
                    {sending === b._id ? 'Sending...' : '📤 Send Now on WhatsApp'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
