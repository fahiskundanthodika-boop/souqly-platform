'use client';
import Sidebar from '../../../components/Sidebar';
import { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const token = typeof window !== 'undefined' ? localStorage.getItem('ownerToken') : null;
  const headers = { Authorization: `Bearer ${token}` };

  async function fetchInvoices(p = 1) {
    setLoading(true);
    try {
      const r = await fetch(`${API}/invoices?page=${p}&limit=20`, { headers });
      const d = await r.json();
      if (d.success) { setInvoices(d.invoices); setTotal(d.total); setPages(d.pages); }
    } finally { setLoading(false); }
  }

  useEffect(() => { fetchInvoices(page); }, [page]);

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", display: "flex", width: "100%" }}><Sidebar /><div className="flex-1 overflow-auto p-6">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: '0 0 4px' }}>Invoices</h1>
        <p style={{ margin: 0, color: '#666', fontSize: 14 }}>{total} GST invoices generated</p>
      </div>

      {loading ? (
        <p style={{ color: '#999' }}>Loading invoices...</p>
      ) : invoices.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#999' }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>ðŸ§¾</div>
          <p style={{ fontWeight: 600, fontSize: 18, color: '#555', margin: '0 0 6px' }}>No invoices yet</p>
          <p style={{ margin: 0 }}>Open any order and click the Invoice button to generate one.</p>
        </div>
      ) : (
        <>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['Invoice No', 'Order', 'Customer', 'Amount', 'Date', 'PDF'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: 12, color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv, i) => (
                  <tr key={inv._id} style={{ borderBottom: i < invoices.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#FF6B35' }}>{inv.invoiceNumber}</td>
                    <td style={{ padding: '12px 16px', color: '#555' }}>
                      #{inv.orderId?.orderId || 'â€”'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 500 }}>{inv.buyerName}</div>
                      <div style={{ fontSize: 12, color: '#9ca3af' }}>{inv.buyerPhone}</div>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>â‚¹{inv.grandTotal?.toLocaleString('en-IN')}</td>
                    <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: 13 }}>
                      {new Date(inv.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {inv.pdfUrl ? (
                        <a href={inv.pdfUrl} target="_blank" rel="noreferrer"
                          style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: 8, padding: '5px 12px', fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>
                          Download
                        </a>
                      ) : 'â€”'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
              {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid #e5e7eb', background: page === p ? '#FF6B35' : '#fff', color: page === p ? '#fff' : '#374151', fontWeight: 600, cursor: 'pointer' }}>
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      )}
        </div>
    </div>
  );
}
