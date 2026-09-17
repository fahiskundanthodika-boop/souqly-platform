// Analytics page - sales charts and insights
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import api from '../../../lib/api';
import toast from 'react-hot-toast';

export default function AnalyticsPage() {
  const [summary, setSummary] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/analytics/summary'),
      api.get('/analytics/sales-chart'),
      api.get('/analytics/top-products')
    ]).then(([s, c, p]) => {
      setSummary(s.data.data);
      setChartData(c.data.data);
      setTopProducts(p.data.data);
    }).catch(() => toast.error('Failed to load analytics')).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-12 text-center text-gray-400">Loading analytics...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-4 flex items-center gap-3">
        <Link href="/dashboard" className="text-gray-400 hover:text-primary">← Dashboard</Link>
        <span className="text-gray-300">/</span>
        <span className="font-bold text-gray-900">Analytics</span>
      </nav>

      <div className="p-6 space-y-6">

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Today's Revenue", value: `₹${summary?.todayRevenue || 0}`, icon: '💰' },
            { label: "This Month", value: `₹${summary?.monthRevenue || 0}`, icon: '📅' },
            { label: "Today's Orders", value: summary?.todayOrders || 0, icon: '📦' },
            { label: 'Total Customers', value: summary?.totalCustomers || 0, icon: '👥' },
          ].map((card, i) => (
            <div key={i} className="card text-center">
              <div className="text-3xl mb-2">{card.icon}</div>
              <div className="text-2xl font-bold text-gray-900">{card.value}</div>
              <div className="text-xs text-gray-400 mt-1">{card.label}</div>
            </div>
          ))}
        </div>

        {/* Sales Chart */}
        <div className="card">
          <h2 className="font-bold text-gray-900 mb-4">Revenue - Last 7 Days</h2>
          {chartData.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No sales data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="_id" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => [`₹${value}`, 'Revenue']} />
                <Bar dataKey="revenue" fill="#FF6B35" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top Products */}
        <div className="card">
          <h2 className="font-bold text-gray-900 mb-4">Best Selling Products</h2>
          {topProducts.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No sales data yet</div>
          ) : (
            <div className="space-y-3">
              {topProducts.map((product, i) => (
                <div key={i} className="flex items-center gap-4">
                  <span className="text-gray-400 text-sm w-6">#{i + 1}</span>
                  <div className="flex-1">
                    <div className="font-medium text-sm text-gray-900">{product.name}</div>
                    <div className="text-xs text-gray-400">{product.totalSold} units sold</div>
                  </div>
                  <span className="font-bold text-primary text-sm">₹{product.revenue}</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
