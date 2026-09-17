// Invoice service - generates PDF invoices using PDFKit
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const moment = require('moment');

// Generate a GST invoice PDF and return it as a buffer
const generateInvoicePDF = async (order, shop) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const buffers = [];

    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // ========== HEADER ==========
    doc.fontSize(20).fillColor('#FF6B35').text('TAX INVOICE', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(14).fillColor('#000').text(shop.name, { align: 'center' });
    doc.fontSize(10).fillColor('#555').text(shop.address || '', { align: 'center' });
    if (shop.gstNumber) {
      doc.text(`GSTIN: ${shop.gstNumber}`, { align: 'center' });
    }
    doc.moveDown();

    // ========== INVOICE DETAILS ==========
    doc.fillColor('#000').fontSize(10);
    doc.text(`Invoice No: INV-${order.orderId}`, 50);
    doc.text(`Date: ${moment(order.createdAt).format('DD MMM YYYY, hh:mm A')}`, 50);
    doc.text(`Order #${order.orderId}`, 50);
    doc.moveDown();

    // ========== CUSTOMER DETAILS ==========
    doc.fontSize(11).fillColor('#333').text('Bill To:', { underline: true });
    doc.fontSize(10).fillColor('#000');
    doc.text(order.customerName);
    doc.text(order.customerPhone);
    if (order.customerAddress) doc.text(order.customerAddress);
    doc.moveDown();

    // ========== ITEMS TABLE ==========
    doc.fillColor('#FF6B35').fontSize(10)
      .text('Item', 50, doc.y, { width: 200 })
      .text('Qty', 260, doc.y - 12, { width: 50 })
      .text('Price', 320, doc.y - 12, { width: 80 })
      .text('Total', 410, doc.y - 12, { width: 90 });

    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('#ccc').stroke();
    doc.moveDown(0.3);

    // List each item
    doc.fillColor('#000');
    order.items.forEach(item => {
      const y = doc.y;
      doc.text(item.name, 50, y, { width: 200 });
      doc.text(String(item.qty), 260, y, { width: 50 });
      doc.text(`₹${item.price}`, 320, y, { width: 80 });
      doc.text(`₹${item.total}`, 410, y, { width: 90 });
      doc.moveDown(0.8);
    });

    doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('#ccc').stroke();
    doc.moveDown(0.5);

    // ========== TOTALS ==========
    doc.text(`Subtotal: ₹${order.subtotal}`, { align: 'right' });
    if (order.deliveryCharge > 0) {
      doc.text(`Delivery: ₹${order.deliveryCharge}`, { align: 'right' });
    }
    if (order.discount > 0) {
      doc.text(`Discount: -₹${order.discount}`, { align: 'right' });
    }
    doc.fontSize(12).fillColor('#FF6B35')
      .text(`TOTAL: ₹${order.total}`, { align: 'right' });

    doc.moveDown();
    doc.fontSize(9).fillColor('#888')
      .text('Thank you for your order! Powered by Souqly', { align: 'center' });
    doc.text('FaizeCart Online Services OPC Pvt Ltd | GSTIN: 32AAFCF7417G1ZU', { align: 'center' });

    doc.end();
  });
};

module.exports = { generateInvoicePDF };
