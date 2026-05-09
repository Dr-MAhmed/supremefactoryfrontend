import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  ntn?: string;
}

interface InvoiceItem {
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
}

interface SaleInvoiceData {
  invoiceNo: string;
  date: string;
  dueDate: string | null;
  customer: string;
  customerAddress?: string;
  customerPhone?: string;
  customerNTN?: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentStatus: string;
  items: InvoiceItem[];
}

interface PurchaseInvoiceData {
  voucherNo: string;
  date: string;
  supplier: string;
  supplierAddress?: string;
  supplierPhone?: string;
  supplierNTN?: string;
  supplierInvoiceNo?: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentStatus: string;
  items: InvoiceItem[];
}

interface ReturnInvoiceData {
  voucherNo: string;
  date: string;
  party: string;
  partyAddress?: string;
  partyPhone?: string;
  partyNTN?: string;
  referenceNo?: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  reason?: string;
  items: InvoiceItem[];
}

const COMPANY_INFO: CompanyInfo = {
  name: 'Supreme Cotton',
  address: 'Faisalabad, Pakistan',
  phone: '+92 41 1234567',
  email: 'info@supremecotton.com',
  ntn: '1234567-8'
};

const formatCurrency = (value: number): string => {
  return `PKR ${value.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateStr;
  }
};

// Safely fetch company settings - uses hardcoded defaults if API call fails
export const getCompanyInfo = (): CompanyInfo => {
  try {
    const stored = localStorage.getItem('companyInfo');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {}
  return COMPANY_INFO;
};

const addHeader = (doc: jsPDF, company: CompanyInfo, docType: string, docNumber: string) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;

  // Company name and title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(company.name, margin, 20);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(company.address, margin, 27);
  doc.text(`Phone: ${company.phone}`, margin, 32);
  doc.text(`Email: ${company.email}`, margin, 37);
  if (company.ntn) {
    doc.text(`NTN: ${company.ntn}`, margin, 42);
  }

  // Document type and number on the right
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  const titleText = docType;
  const titleWidth = doc.getTextWidth(titleText);
  doc.text(titleText, pageWidth - margin - titleWidth, 20);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const noText = `# ${docNumber}`;
  const noWidth = doc.getTextWidth(noText);
  doc.text(noText, pageWidth - margin - noWidth, 27);

  // Divider line
  const headerBottom = company.ntn ? 47 : 42;
  doc.setDrawColor(200);
  doc.line(margin, headerBottom, pageWidth - margin, headerBottom);

  return headerBottom + 8;
};

const addFooter = (doc: jsPDF, paymentStatus: string) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  doc.setDrawColor(200);
  doc.line(margin, pageHeight - 25, pageWidth - margin, pageHeight - 25);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100);
  doc.text(
    `Payment Status: ${paymentStatus === 'PAID' ? '✓ PAID' : paymentStatus === 'PARTIAL' ? '⚠ PARTIAL' : '✗ UNPAID'}`,
    margin,
    pageHeight - 18
  );
  doc.text(
    'This is a computer-generated document.',
    pageWidth - margin - doc.getTextWidth('This is a computer-generated document.'),
    pageHeight - 18
  );
  doc.text(
    'Authorized Signature: _________________________',
    margin,
    pageHeight - 12
  );
  doc.text(
    `Generated on: ${new Date().toLocaleString('en-PK')}`,
    pageWidth - margin - doc.getTextWidth(`Generated on: ${new Date().toLocaleString('en-PK')}`),
    pageHeight - 12
  );
  doc.setTextColor(0);
};

export const generateSalePDF = (data: SaleInvoiceData, company?: CompanyInfo) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const companyInfo = company || getCompanyInfo();
  const margin = 15;
  const pageWidth = doc.internal.pageSize.getWidth();

  const yStart = addHeader(doc, companyInfo, 'SALES INVOICE', data.invoiceNo);

  // Customer and invoice info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60);
  doc.text('Bill To:', margin, yStart + 5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0);
  doc.setFontSize(11);
  doc.text(data.customer, margin, yStart + 11);
  if (data.customerAddress) {
    doc.setFontSize(9);
    doc.text(data.customerAddress, margin, yStart + 17);
  }
  if (data.customerNTN) {
    doc.setFontSize(9);
    doc.text(`NTN: ${data.customerNTN}`, margin, data.customerAddress ? yStart + 22 : yStart + 17);
  }

  // Invoice details on the right
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const detailsX = pageWidth - margin - 60;
  const detailsY = yStart + 5;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60);
  doc.text('Invoice Date:', detailsX, detailsY);
  doc.text('Due Date:', detailsX, detailsY + 7);
  doc.text('Status:', detailsX, detailsY + 14);
  doc.setTextColor(0);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDate(data.date), detailsX + 40, detailsY);
  doc.text(data.dueDate ? formatDate(data.dueDate) : '-', detailsX + 40, detailsY + 7);
  doc.text(data.paymentStatus, detailsX + 40, detailsY + 14);

  // Items table
  const tableY = data.customerAddress || data.customerNTN ? yStart + 27 : yStart + 18;
  const tableTop = tableY + 2;

  autoTable(doc, {
    startY: tableTop,
    head: [['#', 'Description', 'Quantity', 'Unit', 'Rate', 'Amount']],
    body: data.items.map((item, index) => [
      index + 1,
      item.description,
      item.quantity.toString(),
      item.unit,
      formatCurrency(item.rate),
      formatCurrency(item.amount)
    ]),
    foot: [],
    theme: 'grid',
    headStyles: {
      fillColor: [23, 55, 82],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [50, 50, 50]
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 30, halign: 'right' },
      5: { cellWidth: 35, halign: 'right' }
    },
    margin: { left: margin, right: margin }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;

  // Totals section
  const totalsStartX = pageWidth - margin - 70;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', totalsStartX, finalY);
  doc.text(formatCurrency(data.subtotal), pageWidth - margin, finalY, { align: 'right' });

  const discountY = finalY + 6;
  doc.text('Discount:', totalsStartX, discountY);
  doc.text(formatCurrency(data.discount), pageWidth - margin, discountY, { align: 'right' });

  const taxY = finalY + 12;
  doc.text('Tax:', totalsStartX, taxY);
  doc.text(formatCurrency(data.tax), pageWidth - margin, taxY, { align: 'right' });

  // Total line
  const totalY = finalY + 20;
  doc.setDrawColor(23, 55, 82);
  doc.line(totalsStartX, totalY - 5, pageWidth - margin, totalY - 5);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Total:', totalsStartX, totalY);
  doc.text(formatCurrency(data.total), pageWidth - margin, totalY, { align: 'right' });

  // Amount in words
  const inWordsY = totalY + 12;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(80);
  doc.text(`Amount in words: ${numberToWords(data.total)}`, margin, inWordsY);
  doc.setTextColor(0);

  // Footer
  addFooter(doc, data.paymentStatus);

  return doc;
};

export const generatePurchasePDF = (data: PurchaseInvoiceData, company?: CompanyInfo) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const companyInfo = company || getCompanyInfo();
  const margin = 15;
  const pageWidth = doc.internal.pageSize.getWidth();

  const yStart = addHeader(doc, companyInfo, 'PURCHASE VOUCHER', data.voucherNo);

  // Supplier info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60);
  doc.text('Supplier:', margin, yStart + 5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0);
  doc.setFontSize(11);
  doc.text(data.supplier, margin, yStart + 11);
  if (data.supplierAddress) {
    doc.setFontSize(9);
    doc.text(data.supplierAddress, margin, yStart + 17);
  }
  if (data.supplierNTN) {
    doc.setFontSize(9);
    doc.text(`NTN: ${data.supplierNTN}`, margin, data.supplierAddress ? yStart + 22 : yStart + 17);
  }

  // Voucher details on the right
  doc.setFontSize(10);
  const detailsX = pageWidth - margin - 60;
  const detailsY = yStart + 5;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60);
  doc.text('Date:', detailsX, detailsY);
  doc.text('Status:', detailsX, detailsY + 7);
  if (data.supplierInvoiceNo) {
    doc.text('Supplier Inv#:', detailsX, detailsY + 14);
  }
  doc.setTextColor(0);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDate(data.date), detailsX + 40, detailsY);
  doc.text(data.paymentStatus, detailsX + 40, detailsY + 7);
  if (data.supplierInvoiceNo) {
    doc.text(data.supplierInvoiceNo, detailsX + 40, detailsY + 14);
  }

  // Items table
  const tableY = data.supplierAddress || data.supplierNTN || data.supplierInvoiceNo ? yStart + 27 : yStart + 18;
  const tableTop = tableY + 2;

  autoTable(doc, {
    startY: tableTop,
    head: [['#', 'Description', 'Quantity', 'Unit', 'Rate', 'Amount']],
    body: data.items.map((item, index) => [
      index + 1,
      item.description,
      item.quantity.toString(),
      item.unit,
      formatCurrency(item.rate),
      formatCurrency(item.amount)
    ]),
    theme: 'grid',
    headStyles: {
      fillColor: [23, 55, 82],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [50, 50, 50]
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 30, halign: 'right' },
      5: { cellWidth: 35, halign: 'right' }
    },
    margin: { left: margin, right: margin }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;

  // Totals section
  const totalsStartX = pageWidth - margin - 70;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', totalsStartX, finalY);
  doc.text(formatCurrency(data.subtotal), pageWidth - margin, finalY, { align: 'right' });

  const discountY = finalY + 6;
  doc.text('Discount:', totalsStartX, discountY);
  doc.text(formatCurrency(data.discount), pageWidth - margin, discountY, { align: 'right' });

  const taxY = finalY + 12;
  doc.text('Tax:', totalsStartX, taxY);
  doc.text(formatCurrency(data.tax), pageWidth - margin, taxY, { align: 'right' });

  const totalY = finalY + 20;
  doc.setDrawColor(23, 55, 82);
  doc.line(totalsStartX, totalY - 5, pageWidth - margin, totalY - 5);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Total:', totalsStartX, totalY);
  doc.text(formatCurrency(data.total), pageWidth - margin, totalY, { align: 'right' });

  const inWordsY = totalY + 12;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(80);
  doc.text(`Amount in words: ${numberToWords(data.total)}`, margin, inWordsY);
  doc.setTextColor(0);

  addFooter(doc, data.paymentStatus);

  return doc;
};

export const generateSaleReturnPDF = (data: ReturnInvoiceData, company?: CompanyInfo) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const companyInfo = company || getCompanyInfo();
  const margin = 15;
  const pageWidth = doc.internal.pageSize.getWidth();

  const yStart = addHeader(doc, companyInfo, 'SALE RETURN NOTE', data.voucherNo);

  // Party info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60);
  doc.text('Customer:', margin, yStart + 5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0);
  doc.setFontSize(11);
  doc.text(data.party, margin, yStart + 11);
  if (data.partyAddress) {
    doc.setFontSize(9);
    doc.text(data.partyAddress, margin, yStart + 17);
  }
  if (data.partyNTN) {
    doc.setFontSize(9);
    doc.text(`NTN: ${data.partyNTN}`, margin, data.partyAddress ? yStart + 22 : yStart + 17);
  }

  // Details on the right
  doc.setFontSize(10);
  const detailsX = pageWidth - margin - 60;
  const detailsY = yStart + 5;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60);
  doc.text('Date:', detailsX, detailsY);
  if (data.referenceNo) {
    doc.text('Ref. Sale:', detailsX, detailsY + 7);
    doc.text('Reason:', detailsX, detailsY + 14);
  }
  doc.setTextColor(0);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDate(data.date), detailsX + 40, detailsY);
  if (data.referenceNo) {
    doc.text(data.referenceNo, detailsX + 40, detailsY + 7);
    doc.text(data.reason || '-', detailsX + 40, detailsY + 14);
  }

  // Items table
  const tableY = data.partyAddress || data.partyNTN ? yStart + 27 : yStart + 18;
  const tableTop = tableY + 2;

  autoTable(doc, {
    startY: tableTop,
    head: [['#', 'Description', 'Quantity', 'Unit', 'Rate', 'Amount']],
    body: data.items.map((item, index) => [
      index + 1,
      item.description,
      item.quantity.toString(),
      item.unit,
      formatCurrency(item.rate),
      formatCurrency(item.amount)
    ]),
    theme: 'grid',
    headStyles: {
      fillColor: [180, 50, 50],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [50, 50, 50]
    },
    alternateRowStyles: {
      fillColor: [255, 245, 245]
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 30, halign: 'right' },
      5: { cellWidth: 35, halign: 'right' }
    },
    margin: { left: margin, right: margin }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;

  const totalsStartX = pageWidth - margin - 70;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', totalsStartX, finalY);
  doc.text(formatCurrency(data.subtotal), pageWidth - margin, finalY, { align: 'right' });

  const discountY = finalY + 6;
  doc.text('Discount:', totalsStartX, discountY);
  doc.text(formatCurrency(data.discount), pageWidth - margin, discountY, { align: 'right' });

  const taxY = finalY + 12;
  doc.text('Tax:', totalsStartX, taxY);
  doc.text(formatCurrency(data.tax), pageWidth - margin, taxY, { align: 'right' });

  const totalY = finalY + 20;
  doc.setDrawColor(180, 50, 50);
  doc.line(totalsStartX, totalY - 5, pageWidth - margin, totalY - 5);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Total:', totalsStartX, totalY);
  doc.text(formatCurrency(data.total), pageWidth - margin, totalY, { align: 'right' });

  addFooter(doc, 'RETURN');

  return doc;
};

export const generatePurchaseReturnPDF = (data: ReturnInvoiceData, company?: CompanyInfo) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const companyInfo = company || getCompanyInfo();
  const margin = 15;
  const pageWidth = doc.internal.pageSize.getWidth();

  const yStart = addHeader(doc, companyInfo, 'PURCHASE RETURN NOTE', data.voucherNo);

  // Party info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60);
  doc.text('Supplier:', margin, yStart + 5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0);
  doc.setFontSize(11);
  doc.text(data.party, margin, yStart + 11);
  if (data.partyAddress) {
    doc.setFontSize(9);
    doc.text(data.partyAddress, margin, yStart + 17);
  }
  if (data.partyNTN) {
    doc.setFontSize(9);
    doc.text(`NTN: ${data.partyNTN}`, margin, data.partyAddress ? yStart + 22 : yStart + 17);
  }

  const detailsX = pageWidth - margin - 60;
  const detailsY = yStart + 5;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60);
  doc.text('Date:', detailsX, detailsY);
  if (data.referenceNo) {
    doc.text('Ref. Purchase:', detailsX, detailsY + 7);
    doc.text('Reason:', detailsX, detailsY + 14);
  }
  doc.setTextColor(0);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDate(data.date), detailsX + 40, detailsY);
  if (data.referenceNo) {
    doc.text(data.referenceNo, detailsX + 40, detailsY + 7);
    doc.text(data.reason || '-', detailsX + 40, detailsY + 14);
  }

  const tableY = data.partyAddress || data.partyNTN ? yStart + 27 : yStart + 18;
  const tableTop = tableY + 2;

  autoTable(doc, {
    startY: tableTop,
    head: [['#', 'Description', 'Quantity', 'Unit', 'Rate', 'Amount']],
    body: data.items.map((item, index) => [
      index + 1,
      item.description,
      item.quantity.toString(),
      item.unit,
      formatCurrency(item.rate),
      formatCurrency(item.amount)
    ]),
    theme: 'grid',
    headStyles: {
      fillColor: [180, 50, 50],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [50, 50, 50]
    },
    alternateRowStyles: {
      fillColor: [255, 245, 245]
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 30, halign: 'right' },
      5: { cellWidth: 35, halign: 'right' }
    },
    margin: { left: margin, right: margin }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;

  const totalsStartX = pageWidth - margin - 70;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', totalsStartX, finalY);
  doc.text(formatCurrency(data.subtotal), pageWidth - margin, finalY, { align: 'right' });

  const discountY = finalY + 6;
  doc.text('Discount:', totalsStartX, discountY);
  doc.text(formatCurrency(data.discount), pageWidth - margin, discountY, { align: 'right' });

  const taxY = finalY + 12;
  doc.text('Tax:', totalsStartX, taxY);
  doc.text(formatCurrency(data.tax), pageWidth - margin, taxY, { align: 'right' });

  const totalY = finalY + 20;
  doc.setDrawColor(180, 50, 50);
  doc.line(totalsStartX, totalY - 5, pageWidth - margin, totalY - 5);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Total:', totalsStartX, totalY);
  doc.text(formatCurrency(data.total), pageWidth - margin, totalY, { align: 'right' });

  addFooter(doc, 'RETURN');

  return doc;
};

// Helper: Convert number to words (PKR)
const numberToWords = (num: number): string => {
  if (num === 0) return 'Zero';

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertLessThanThousand = (n: number): string => {
    if (n === 0) return '';
    let str = '';
    if (n >= 100) {
      str += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      str += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      str += ones[n] + ' ';
    }
    return str;
  };

  const rupees = Math.floor(num);
  const paisa = Math.round((num - rupees) * 100);

  let result = '';
  const crore = Math.floor(rupees / 10000000);
  const lakh = Math.floor((rupees % 10000000) / 100000);
  const thousand = Math.floor((rupees % 100000) / 1000);
  const hundred = rupees % 1000;

  if (crore) result += convertLessThanThousand(crore) + 'Crore ';
  if (lakh) result += convertLessThanThousand(lakh) + 'Lakh ';
  if (thousand) result += convertLessThanThousand(thousand) + 'Thousand ';
  if (hundred) result += convertLessThanThousand(hundred);

  result += 'Rupees';

  if (paisa > 0) {
    if (paisa < 20) {
      result += ' and ' + ones[paisa] + ' Paisa';
    } else {
      result += ' and ' + tens[Math.floor(paisa / 10)] + ' ' + ones[paisa % 10] + ' Paisa';
    }
  }

  result += ' Only';
  return result.replace(/\s+/g, ' ').trim();
};

// Utility: Open PDF in new window for printing
export const openPDFForPrint = (doc: jsPDF, title: string) => {
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (win) {
    win.document.title = title;
    win.onload = () => {
      win.print();
    };
  }
};

// Utility: Download PDF
export const downloadPDF = (doc: jsPDF, filename: string) => {
  doc.save(filename);
};