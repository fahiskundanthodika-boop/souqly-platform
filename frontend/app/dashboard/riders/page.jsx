// Riders management page - add and manage delivery staff
'use client';
import Sidebar from '../../../components/Sidebar';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '../../../lib/api';
import toast from 'react-hot-toast';

export default function RidersPage() {
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', pin: '', vehicleType: 'bike' });

  const fetchRiders = async () => {
    try {
      const res = await api.get('/riders');
      setRiders(res.data.riders);
    } catch (err) {
      toast.error('Failed to load riders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRiders(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.pin.length !== 4 || isNaN(form.pin)) {
      toast.error('PIN must be exactly 4 digits');
      return;
    }
    try {
      await api.post('/riders', form);
      toast.success('Rider added! They can now login using their phone and PIN.');
      setShowForm(false);
      setForm({ name: '', phone: '', pin: '', vehicleType: 'bike' });
      fetchRiders();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add rider');
    }
  };

  const toggleApproval = async (rider) => {
    try {
      await api.put(`/riders/${rider._id}`, { isApproved: !rider.isApproved });
      toast.success(rider.isApproved ? 'Rider deactivated' : 'Rider activated');
      fetchRiders();
    } catch (err) {
      toast.error('Failed to update rider');
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", display: "flex", width: "100%" }} style={{ background: "#080808" }}><Sidebar /><div className="flex-1 overflow-auto" style={{ background: "#080808" }}>
      <nav className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-gray-400 hover:text-primary">â† Dashboard</Link>
          <span className="text-gray-300">/</span>
          <span className="font-bold text-gray-900">Riders</span>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary text-sm py-2 px-4">
          + Add Rider
        </button>
      </nav>

      <div className="p-6">
        {showForm && (
          <div className="card mb-6">
            <h2 className="font-bold text-gray-900 mb-4">Add New Rider</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input placeholder="Rider's Name *" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" required />
              <input placeholder="Phone Number *" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
                className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" required />
              <input placeholder="4-digit PIN *" value={form.pin} onChange={e => setForm({...form, pin: e.target.value})}
                maxLength={4} className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" required />
              <select value={form.vehicleType} onChange={e => setForm({...form, vehicleType: e.target.value})}
                className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="bike">Bike</option>
                <option value="bicycle">Bicycle</option>
                <option value="auto">Auto</option>
                <option value="car">Car</option>
              </select>
              <div className="flex gap-3 md:col-span-2">
                <button type="submit" className="btn-primary">Add Rider</button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-outline">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading riders...</div>
        ) : riders.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-5xl mb-3">ðŸ›µ</div>
            <p>No riders yet. Add your delivery staff!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {riders.map(rider => (
              <div key={rider._id} className="card">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                    {rider.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">{rider.name}</div>
                    <div className="text-sm text-gray-400">{rider.phone}</div>
                  </div>
                  <div className={`ml-auto text-xs px-2 py-1 rounded-full ${rider.isOnline ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {rider.isOnline ? 'ðŸŸ¢ Online' : 'âš« Offline'}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                  <div className="bg-gray-50 rounded-lg p-2 text-center">
                    <div className="font-bold">{rider.totalDeliveries}</div>
                    <div className="text-xs text-gray-400">Total Deliveries</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2 text-center">
                    <div className="font-bold">â‚¹{rider.totalEarnings}</div>
                    <div className="text-xs text-gray-400">Total Earned</div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">ðŸ›µ {rider.vehicleType}</span>
                  <button
                    onClick={() => toggleApproval(rider)}
                    className={`text-xs px-3 py-1.5 rounded-lg ${rider.isApproved ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'}`}
                  >
                    {rider.isApproved ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
        </div>
    </div>
  );
}
