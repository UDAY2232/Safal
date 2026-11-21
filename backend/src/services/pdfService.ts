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
  const isCD = String(data.poNumber || '').startsWith('CD/');
  const doc = new PDFDocument({ margin: 40, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${isCD ? 'CustomerDue' : 'PurchaseOrder'}-${data.poNumber.replace(/\//g, '_')}.pdf"`
  );

  doc.pipe(res);

  // Header Banner
  doc.rect(40, 40, 515, 65).fill('#064D2B');
  doc.fillColor('#FFFFFF').fontSize(20).font('Helvetica-Bold').text('SAFAL APP', 55, 52);
  doc.fontSize(11).font('Helvetica').text('SAFAL EXPORT AND IMPORT PVT LTD', 55, 76);
  doc.fontSize(9).text('Premium Fruits Import & Export Management', 55, 90);

  doc.fontSize(15).font('Helvetica-Bold').text(isCD ? 'CUSTOMER DUE (CD)' : 'PURCHASE ORDER', 340, 54, { align: 'right', width: 205 });
  doc.fontSize(10).font('Helvetica').text(`Status: ${data.status}`, 340, 78, { align: 'right', width: 205 });

  doc.fillColor('#1B2B21');

  // Metadata block
  const topY = 120;
  doc.fontSize(10).font('Helvetica-Bold').text(isCD ? 'Customer Due Details:' : 'PO Details:', 40, topY);
  doc.font('Helvetica').fontSize(9);
  doc.text(`${isCD ? 'CD Number' : 'PO Number'}: ${data.poNumber}`, 40, topY + 16, { width: 240 });
  doc.text(`${isCD ? 'Order Date' : 'PO Date'}: ${data.poDate}`, 40, topY + 30, { width: 240 });
  if (!isCD) {
    doc.text(`Expected Delivery: ${data.expectedDeliveryDate || 'N/A'}`, 40, topY + 44, { width: 240 });
    doc.text(`Created By: ${data.createdByName}`, 40, topY + 58, { width: 240 });
  } else {
    doc.text(`Created By: ${data.createdByName}`, 40, topY + 44, { width: 240 });
  }

  doc.font('Helvetica-Bold').fontSize(10).text(isCD ? 'Customer & Payment Details:' : 'Financial & Payment Details:', 300, topY);
  doc.font('Helvetica').fontSize(9);
  doc.text(`${isCD ? 'Customer / Shop' : 'Supplier'}: ${data.supplierName}`, 300, topY + 16, { width: 250 });
  doc.text(`${isCD ? 'Payed Amount' : 'Advance Paid'}: Rs. ${Number(data.advanceAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 300, topY + 30, { width: 250 });
  doc.text(`${isCD ? 'Pending CD Balance' : 'Pending Due'}: Rs. ${Number(data.pendingAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 300, topY + 44, { width: 250 });
  if (data.supplierContact) doc.text(`Contact: ${data.supplierContact}`, 300, topY + 58, { width: 250 });

  // Table header
  const tableY = 205;
  doc.rect(40, tableY, 515, 22).fill('#E7F5E9');
  doc.fillColor('#064D2B').font('Helvetica-Bold').fontSize(8);
  doc.text('Item / Fruit', 45, tableY + 6, { width: 120 });
  doc.text('Variety / Grade', 170, tableY + 6, { width: 95 });
  doc.text('Qty & Unit', 270, tableY + 6, { width: 65 });
  doc.text('Rate (Rs.)', 340, tableY + 6, { width: 60, align: 'right' });
  doc.text('Disc/Tax', 405, tableY + 6, { width: 60, align: 'center' });
  doc.text('Line Total (Rs.)', 470, tableY + 6, { width: 80, align: 'right' });

  // Items
  let currentY = tableY + 24;
  doc.font('Helvetica').fontSize(8).fillColor('#1B2B21');

  data.items.forEach((item, index) => {
    const isEven = index % 2 === 0;
    if (isEven) {
      doc.rect(40, currentY - 2, 515, 18).fill('#F9FCF9');
      doc.fillColor('#1B2B21');
    }

    doc.text(String(item.fruitName || ''), 45, currentY + 3, { width: 120, ellipsis: true });
    doc.text(`${item.varietyGrade || ''} (${item.category || ''})`, 170, currentY + 3, { width: 95, ellipsis: true });
    doc.text(`${item.quantity} ${item.unit}`, 270, currentY + 3, { width: 65, ellipsis: true });
    doc.text(`Rs. ${Number(item.ratePerUnit).toLocaleString('en-IN')}`, 340, currentY + 3, { width: 60, align: 'right' });
    doc.text(`-${item.discountPercent}% / +${item.taxPercent}%`, 405, currentY + 3, { width: 60, align: 'center' });
    doc.text(`Rs. ${Number(item.lineTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 470, currentY + 3, { width: 80, align: 'right' });

    currentY += 20;
  });

  // Totals Box
  currentY += 15;
  doc.rect(330, currentY, 225, 110).stroke('#CBD9CE');
  doc.font('Helvetica').fontSize(9);
  doc.text('Subtotal:', 340, currentY + 8, { width: 100 });
  doc.text(`Rs. ${Number(data.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 440, currentY + 8, { align: 'right', width: 105 });

  doc.text('Discount Total:', 340, currentY + 24, { width: 100 });
  doc.text(`- Rs. ${Number(data.discountTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 440, currentY + 24, { align: 'right', width: 105 });

  doc.text('Tax Total:', 340, currentY + 40, { width: 100 });
  doc.text(`+ Rs. ${Number(data.taxTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 440, currentY + 40, { align: 'right', width: 105 });

  doc.font('Helvetica-Bold').fontSize(10).fillColor('#064D2B');
  doc.text(isCD ? 'Total CD Value:' : 'Grand Total:', 340, currentY + 56, { width: 110 });
  doc.text(`Rs. ${Number(data.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 440, currentY + 56, { align: 'right', width: 105 });

  doc.font('Helvetica').fontSize(9).fillColor('#0369A1');
  doc.text(isCD ? 'Payed Amount:' : 'Advance Paid:', 340, currentY + 74, { width: 110 });
  doc.text(`Rs. ${Number(data.advanceAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 440, currentY + 74, { align: 'right', width: 105 });

  doc.font('Helvetica-Bold').fontSize(9).fillColor('#B91C1C');
  doc.text(isCD ? 'Pending CD Balance:' : 'Pending Balance:', 340, currentY + 90, { width: 110 });
  doc.text(`Rs. ${Number(data.pendingAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 440, currentY + 90, { align: 'right', width: 105 });

  // Notes & Address
  doc.fillColor('#1B2B21').font('Helvetica').fontSize(9);
  doc.text(isCD ? 'Shop Address:' : 'Delivery Address:', 40, currentY);
  doc.text(data.deliveryAddress || (isCD ? 'Shop address on record' : 'Standard Warehouse Receiving, SAFAL Cold Storage Facility'), 40, currentY + 14, { width: 270 });

  if (data.notes) {
    doc.text(`${isCD ? 'Customer Due Notes' : 'Notes'}: ${data.notes}`, 40, currentY + 44, { width: 270 });
  }

  // Footer
  const footerY = 720;
  doc.strokeColor('#CBD9CE').moveTo(40, footerY).lineTo(555, footerY).stroke();
  doc.fontSize(8).fillColor('#64746A');
  doc.text('Authorized Signatory - SAFAL EXPORT AND IMPORT PVT LTD', 40, footerY + 12);
  doc.text(`Generated via SAFAL APP Enterprise Management System (${isCD ? 'CD Dossier' : 'PO Dossier'})`, 260, footerY + 12, { align: 'right', width: 295 });

  doc.end();
}
