import PDFDocument from 'pdfkit';
import { Response } from 'express';

interface POItem {
  fruitName: string;
  category: string;
  varietyGrade: string;
  quantity: number | string;
  unit: string;
  ratePerUnit: number | string;
  discountPercent: number | string;
  taxPercent: number | string;
  lineTotal: number | string;
}

interface POPDFData {
  poNumber: string;
  poDate: string;
  expectedDeliveryDate?: string | null;
  supplierName: string;
  supplierAddress?: string | null;
  supplierContact?: string | null;
  createdByName: string;
  deliveryAddress?: string | null;
  paymentTerms?: string | null;
  advanceAmount?: number | string | null;
  pendingAmount?: number | string | null;
  notes?: string | null;
  subtotal: number | string;
  discountTotal: number | string;
  taxTotal: number | string;
  grandTotal: number | string;
  status: string;
  items: POItem[];
}

export function generatePurchaseOrderPDF(data: POPDFData, res: Response) {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="PurchaseOrder-${data.poNumber.replace(/\//g, '_')}.pdf"`
  );

  doc.pipe(res);

  // Header
  doc.rect(40, 40, 515, 65).fill('#064D2B');
  doc.fillColor('#FFFFFF').fontSize(20).font('Helvetica-Bold').text('SAFAL APP', 55, 52);
  doc.fontSize(11).font('Helvetica').text('SAFAL EXPORT AND IMPORT PVT LTD', 55, 76);
  doc.fontSize(9).text('Premium Fruits Import & Export Management', 55, 90);

  doc.fontSize(16).font('Helvetica-Bold').text('PURCHASE ORDER', 390, 55, { align: 'right' });
  doc.fontSize(10).font('Helvetica').text(`Status: ${data.status}`, 390, 78, { align: 'right' });

  doc.fillColor('#1B2B21');

  // Metadata block
  const topY = 120;
  doc.fontSize(10).font('Helvetica-Bold').text('PO Details:', 40, topY);
  doc.font('Helvetica').fontSize(9);
  doc.text(`PO Number: ${data.poNumber}`, 40, topY + 16);
  doc.text(`PO Date: ${data.poDate}`, 40, topY + 30);
  doc.text(`Expected Delivery: ${data.expectedDeliveryDate || 'N/A'}`, 40, topY + 44);
  doc.text(`Created By: ${data.createdByName}`, 40, topY + 58);

  doc.font('Helvetica-Bold').fontSize(10).text('Financial & Payment Details:', 300, topY);
  doc.font('Helvetica').fontSize(9);
  doc.text(`Supplier: ${data.supplierName}`, 300, topY + 16);
  doc.text(`Advance Paid: ₹${Number(data.advanceAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 300, topY + 30);
  doc.text(`Pending Due: ₹${Number(data.pendingAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 300, topY + 44);
  if (data.supplierContact) doc.text(`Contact: ${data.supplierContact}`, 300, topY + 58);

  // Table header
  const tableY = 205;
  doc.rect(40, tableY, 515, 22).fill('#E7F5E9');
  doc.fillColor('#064D2B').font('Helvetica-Bold').fontSize(8);
  doc.text('Item / Fruit', 45, tableY + 6);
  doc.text('Variety / Grade', 145, tableY + 6);
  doc.text('Qty & Unit', 255, tableY + 6);
  doc.text('Rate (₹)', 330, tableY + 6);
  doc.text('Disc/Tax', 400, tableY + 6);
  doc.text('Line Total (₹)', 480, tableY + 6, { align: 'right' });

  // Items
  let currentY = tableY + 24;
  doc.font('Helvetica').fontSize(8).fillColor('#1B2B21');

  data.items.forEach((item, index) => {
    const isEven = index % 2 === 0;
    if (isEven) {
      doc.rect(40, currentY - 2, 515, 18).fill('#F9FCF9');
      doc.fillColor('#1B2B21');
    }

    doc.text(item.fruitName, 45, currentY + 3);
    doc.text(`${item.varietyGrade} (${item.category})`, 145, currentY + 3);
    doc.text(`${item.quantity} ${item.unit}`, 255, currentY + 3);
    doc.text(`₹${Number(item.ratePerUnit).toLocaleString('en-IN')}`, 330, currentY + 3);
    doc.text(`-${item.discountPercent}% / +${item.taxPercent}%`, 400, currentY + 3);
    doc.text(`₹${Number(item.lineTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 480, currentY + 3, { align: 'right' });

    currentY += 20;
  });

  // Totals
  currentY += 15;
  doc.rect(340, currentY, 215, 110).stroke('#CBD9CE');
  doc.font('Helvetica').fontSize(9);
  doc.text('Subtotal:', 350, currentY + 8);
  doc.text(`₹${Number(data.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 470, currentY + 8, { align: 'right' });

  doc.text('Discount Total:', 350, currentY + 24);
  doc.text(`- ₹${Number(data.discountTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 470, currentY + 24, { align: 'right' });

  doc.text('Tax Total:', 350, currentY + 40);
  doc.text(`+ ₹${Number(data.taxTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 470, currentY + 40, { align: 'right' });

  doc.font('Helvetica-Bold').fontSize(10).fillColor('#064D2B');
  doc.text('Grand Total:', 350, currentY + 56);
  doc.text(`₹${Number(data.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 470, currentY + 56, { align: 'right' });

  doc.font('Helvetica').fontSize(9).fillColor('#0369A1');
  doc.text('Advance Paid:', 350, currentY + 74);
  doc.text(`₹${Number(data.advanceAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 470, currentY + 74, { align: 'right' });

  doc.font('Helvetica-Bold').fontSize(9).fillColor('#B91C1C');
  doc.text('Pending Balance:', 350, currentY + 90);
  doc.text(`₹${Number(data.pendingAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 470, currentY + 90, { align: 'right' });

  // Notes & Signatures
  doc.fillColor('#1B2B21').font('Helvetica').fontSize(9);
  doc.text('Delivery Address:', 40, currentY);
  doc.text(data.deliveryAddress || 'Standard Warehouse Receiving, SAFAL Cold Storage Facility', 40, currentY + 14, { width: 280 });

  if (data.notes) {
    doc.text(`Notes: ${data.notes}`, 40, currentY + 40, { width: 280 });
  }

  // Footer
  const footerY = 720;
  doc.strokeColor('#CBD9CE').moveTo(40, footerY).lineTo(555, footerY).stroke();
  doc.fontSize(8).fillColor('#64746A');
  doc.text('Authorized Signatory - SAFAL EXPORT AND IMPORT PVT LTD', 40, footerY + 12);
  doc.text('Generated via SAFAL APP Enterprise Management System', 320, footerY + 12, { align: 'right' });

  doc.end();
}

