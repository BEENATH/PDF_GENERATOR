const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const pdfService = require('../services/pdfService');



const authenticateApiKey = (req, res, next) => {
  const configuredApiKey = process.env.API_KEY;
  if (!configuredApiKey) return next(); 

  const authHeader = req.headers['authorization'];
  let apiKey = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    apiKey = authHeader.substring(7);
  } else if (req.headers['x-api-key']) {
    apiKey = req.headers['x-api-key'];
  } else if (req.query.apiKey) {
    apiKey = req.query.apiKey;
  }

  if (!apiKey || apiKey !== configuredApiKey) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized. Invalid or missing API Key.',
      hint: 'Pass your key via: Authorization: Bearer <key>  OR  x-api-key: <key>'
    });
  }
  next();
};



const sendPdfResponse = (res, pdfBuffer, req) => {
  const filename = req.query.filename || req.body.filename || 'generated-document.pdf';
  const isDownload = req.query.download === 'true' || req.body.download === true;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `${isDownload ? 'attachment' : 'inline'}; filename="${filename}"`
  );
  res.send(pdfBuffer);
};


router.use('/generate', authenticateApiKey);



function buildInvoiceHtml(data) {
  const {
    
    from = {},
    
    to = {},
    
    invoiceNumber = 'INV-001',
    invoiceDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    dueDate = '',
    currency = 'USD',
    currencySymbol = '$',
    paymentMethod = '',
    notes = '',

    items = [],

    taxRate = 0,
    discountRate = 0,

    accentColor = '#2563eb',
    logoText = '',
    logoUrl = '',
    logoWidth = '120px',
    fontFamily = 'Inter'
  } = data;

  const fontImport = fontFamily && fontFamily !== 'Inter'
    ? `@import url('https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, '+')}:wght@300;400;500;600;700&display=swap');`
    : `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');`;

  const fontStack = fontFamily
    ? `'${fontFamily}', -apple-system, BlinkMacSystemFont, sans-serif`
    : `'Inter', -apple-system, BlinkMacSystemFont, sans-serif`;

  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" alt="${logoText || from.company || 'Logo'}" style="max-width: ${logoWidth}; height: auto; display: block; margin-bottom: 8px;">`
    : `<div class="brand-logo">${logoText || from.company || 'Invoice'}</div>`;

  
  const subtotal = items.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unitPrice) || 0;
    return sum + qty * price;
  }, 0);

  const discountAmount = subtotal * (parseFloat(discountRate) / 100);
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = taxableAmount * (parseFloat(taxRate) / 100);
  const total = taxableAmount + taxAmount;

  const fmt = (n) => `${currencySymbol}${Number(n).toFixed(2)}`;

  const itemRows = items.map((item) => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unitPrice) || 0;
    const amount = qty * price;
    return `
      <tr>
        <td class="item-name">
          <strong>${item.name || ''}</strong>
          ${item.description ? `<br><span class="item-desc">${item.description}</span>` : ''}
        </td>
        <td class="text-center">${qty}</td>
        <td class="text-right">${fmt(price)}</td>
        <td class="text-right amount">${fmt(amount)}</td>
      </tr>`;
  }).join('');

  const totalsRows = `
    <tr><td colspan="2">Subtotal</td><td class="text-right">${fmt(subtotal)}</td></tr>
    ${discountRate > 0 ? `<tr><td colspan="2">Discount (${discountRate}%)</td><td class="text-right">-${fmt(discountAmount)}</td></tr>` : ''}
    ${taxRate > 0 ? `<tr><td colspan="2">Tax (${taxRate}%)</td><td class="text-right">${fmt(taxAmount)}</td></tr>` : ''}
    <tr class="total-row"><td colspan="2">Total Due</td><td class="text-right">${fmt(total)}</td></tr>
  `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoiceNumber}</title>
  <style>
    ${fontImport}

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: ${fontStack};
      color: #1e293b;
      background: #fff;
      font-size: 14px;
      line-height: 1.5;
      padding: 48px;
    }

    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 48px;
    }
    .brand-logo {
      font-size: 26px;
      font-weight: 800;
      color: ${accentColor};
      letter-spacing: -0.5px;
    }
    .brand-details { margin-top: 8px; color: #64748b; font-size: 13px; line-height: 1.7; }

    .invoice-meta { text-align: right; }
    .invoice-title {
      font-size: 34px;
      font-weight: 300;
      text-transform: uppercase;
      letter-spacing: 3px;
      color: #0f172a;
    }
    .invoice-badge {
      display: inline-block;
      margin-top: 8px;
      padding: 4px 14px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.5px;
      background: ${accentColor}18;
      color: ${accentColor};
    }
    .meta-grid { margin-top: 12px; font-size: 13px; color: #475569; }
    .meta-grid div { margin-top: 4px; }
    .meta-grid strong { color: #0f172a; }

    
    .divider {
      height: 2px;
      background: linear-gradient(to right, ${accentColor}, transparent);
      margin: 0 0 36px 0;
      border: none;
    }

    
    .billing-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
      gap: 40px;
    }
    .billing-block { flex: 1; }
    .billing-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #94a3b8;
      margin-bottom: 10px;
    }
    .billing-name { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
    .billing-detail { font-size: 13px; color: #64748b; line-height: 1.7; }

    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 0;
    }
    thead th {
      padding: 12px 16px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #fff;
      background: ${accentColor};
    }
    thead th:first-child { border-radius: 8px 0 0 0; text-align: left; }
    thead th:last-child  { border-radius: 0 8px 0 0; }

    tbody tr { border-bottom: 1px solid #f1f5f9; }
    tbody tr:hover { background: #f8fafc; }
    tbody td { padding: 16px; color: #334155; vertical-align: top; }

    .item-name strong { font-weight: 600; color: #0f172a; }
    .item-desc { font-size: 12px; color: #94a3b8; margin-top: 2px; }
    .amount { font-weight: 600; color: #0f172a; }

    
    .totals-wrapper {
      display: flex;
      justify-content: flex-end;
      margin-top: 0;
    }
    .totals-table {
      width: 320px;
      border-collapse: collapse;
      border-top: 2px solid #e2e8f0;
    }
    .totals-table td {
      padding: 10px 16px;
      font-size: 14px;
      color: #475569;
    }
    .totals-table .total-row td {
      padding-top: 14px;
      font-size: 17px;
      font-weight: 700;
      color: #0f172a;
      border-top: 2px solid #e2e8f0;
    }

    
    .bottom-section {
      display: flex;
      justify-content: space-between;
      margin-top: 40px;
      gap: 40px;
    }
    .notes-block { flex: 1; }
    .notes-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #94a3b8;
      margin-bottom: 8px;
    }
    .notes-text { font-size: 13px; color: #64748b; line-height: 1.6; }

    .payment-block {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px 24px;
      min-width: 240px;
    }
    .payment-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #94a3b8;
      margin-bottom: 8px;
    }
    .payment-method { font-size: 14px; font-weight: 600; color: #0f172a; }
    .payment-due { font-size: 13px; color: #64748b; margin-top: 4px; }

    
    .footer {
      margin-top: 48px;
      padding-top: 20px;
      border-top: 1px solid #f1f5f9;
      text-align: center;
      font-size: 12px;
      color: #94a3b8;
    }

    
    .text-right  { text-align: right; }
    .text-center { text-align: center; }
  </style>
</head>
<body>

  <div class="header">
    <div>
      ${logoHtml}
      <div class="brand-details">
        ${from.address ? from.address + '<br>' : ''}
        ${from.city ? from.city + '<br>' : ''}
        ${from.email ? from.email + '<br>' : ''}
        ${from.phone ? from.phone : ''}
      </div>
    </div>
    <div class="invoice-meta">
      <div class="invoice-title">Invoice</div>
      <div class="invoice-badge">${invoiceNumber}</div>
      <div class="meta-grid">
        <div><strong>Date:</strong> ${invoiceDate}</div>
        ${dueDate ? `<div><strong>Due:</strong> ${dueDate}</div>` : ''}
        <div><strong>Currency:</strong> ${currency}</div>
      </div>
    </div>
  </div>

  <hr class="divider">

  <div class="billing-section">
    <div class="billing-block">
      <div class="billing-label">Billed To</div>
      <div class="billing-name">${to.name || ''}</div>
      <div class="billing-detail">
        ${to.company ? to.company + '<br>' : ''}
        ${to.address ? to.address + '<br>' : ''}
        ${to.city ? to.city + '<br>' : ''}
        ${to.email ? to.email : ''}
      </div>
    </div>
    <div class="billing-block">
      <div class="billing-label">From</div>
      <div class="billing-name">${from.company || ''}</div>
      <div class="billing-detail">
        ${from.address ? from.address + '<br>' : ''}
        ${from.city ? from.city + '<br>' : ''}
        ${from.email ? from.email + '<br>' : ''}
        ${from.taxId ? 'Tax ID: ' + from.taxId : ''}
      </div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th class="text-center" style="width:70px">Qty</th>
        <th class="text-right" style="width:120px">Unit Price</th>
        <th class="text-right" style="width:130px">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows || '<tr><td colspan="4" style="text-align:center;color:#94a3b8;padding:30px;">No items added</td></tr>'}
    </tbody>
  </table>

  <div class="totals-wrapper">
    <table class="totals-table">
      ${totalsRows}
    </table>
  </div>

  <div class="bottom-section">
    ${notes ? `<div class="notes-block"><div class="notes-title">Notes</div><div class="notes-text">${notes}</div></div>` : '<div></div>'}
    ${paymentMethod ? `
    <div class="payment-block">
      <div class="payment-title">Payment Method</div>
      <div class="payment-method">${paymentMethod}</div>
      ${dueDate ? `<div class="payment-due">Due by ${dueDate}</div>` : ''}
    </div>` : ''}
  </div>

  <div class="footer">
    Thank you for your business!
    ${from.company ? ` — ${from.company}` : ''}
  </div>

</body>
</html>`;
}


const handleInvoiceGenerate = async (req, res) => {
  let body;
  if (req.method === 'GET') {
    if (req.query.data) {
      try {
        body = JSON.parse(req.query.data);
      } catch (e) {
        return res.status(400).json({ success: false, error: 'Invalid JSON in "data" query parameter.' });
      }
    } else {
      body = { ...req.query };
      
      if (typeof body.from === 'string') {
        try { body.from = JSON.parse(body.from); } catch (e) {}
      }
      if (typeof body.to === 'string') {
        try { body.to = JSON.parse(body.to); } catch (e) {}
      }
      if (typeof body.items === 'string') {
        try { body.items = JSON.parse(body.items); } catch (e) {}
      }
    }
  } else {
    body = req.body;
  }

  
  if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: "items" must be a non-empty array.',
      example: {
        items: [
          { name: 'Web Development', description: 'Frontend build', quantity: 10, unitPrice: 150 }
        ]
      }
    });
  }

  try {
    const html = buildInvoiceHtml(body);
    const pdfBuffer = await pdfService.generateFromHtml(html, {
      format: body.format || 'A4',
      landscape: body.landscape === 'true' || body.landscape === true,
      printBackground: body.printBackground !== 'false' && body.printBackground !== false,
      marginTop: body.marginTop || '0mm',
      marginBottom: body.marginBottom || '0mm',
      marginLeft: body.marginLeft || '0mm',
      marginRight: body.marginRight || '0mm'
    });

    const filename = body.filename || `invoice-${body.invoiceNumber || 'document'}.pdf`;
    const isDownload = req.query.download === 'true' || body.download === true;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `${isDownload ? 'attachment' : 'inline'}; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to generate invoice PDF',
      details: error.message
    });
  }
};

const handleHtmlGenerate = async (req, res) => {
  let html, options;
  if (req.method === 'GET') {
    html = req.query.html;
    options = req.query.options;
    if (typeof options === 'string') {
      try { options = JSON.parse(options); } catch (e) { options = {}; }
    }
    if (!options) {
      options = { ...req.query };
    }
  } else {
    html = req.body.html;
    options = req.body.options;
  }

  if (!html) {
    return res.status(400).json({ success: false, error: 'Missing required field: "html"' });
  }

  try {
    const pdfBuffer = await pdfService.generateFromHtml(html, options);
    sendPdfResponse(res, pdfBuffer, req);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to generate PDF from HTML', details: error.message });
  }
};

const handleUrlGenerate = async (req, res) => {
  let url, options;
  if (req.method === 'GET') {
    url = req.query.url;
    options = req.query.options;
    if (typeof options === 'string') {
      try { options = JSON.parse(options); } catch (e) { options = {}; }
    }
    if (!options) {
      options = { ...req.query };
    }
  } else {
    url = req.body.url;
    options = req.body.options;
  }

  if (!url) {
    return res.status(400).json({ success: false, error: 'Missing required field: "url"' });
  }

  try {
    const pdfBuffer = await pdfService.generateFromUrl(url, options);
    sendPdfResponse(res, pdfBuffer, req);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to generate PDF from URL', details: error.message });
  }
};

const handleMarkdownGenerate = async (req, res) => {
  let markdown, options;
  if (req.method === 'GET') {
    markdown = req.query.markdown;
    options = req.query.options;
    if (typeof options === 'string') {
      try { options = JSON.parse(options); } catch (e) { options = {}; }
    }
    if (!options) {
      options = { ...req.query };
    }
  } else {
    markdown = req.body.markdown;
    options = req.body.options;
  }

  if (!markdown) {
    return res.status(400).json({ success: false, error: 'Missing required field: "markdown"' });
  }

  try {
    const pdfBuffer = await pdfService.generateFromMarkdown(markdown, options);
    sendPdfResponse(res, pdfBuffer, req);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to generate PDF from Markdown', details: error.message });
  }
};

const handleTemplateGenerate = async (req, res) => {
  let template, data, options;
  if (req.method === 'GET') {
    template = req.query.template;
    data = req.query.data;
    options = req.query.options;
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch (e) { data = {}; }
    }
    if (typeof options === 'string') {
      try { options = JSON.parse(options); } catch (e) { options = {}; }
    }
    if (!options) {
      options = { ...req.query };
    }
  } else {
    template = req.body.template;
    data = req.body.data;
    options = req.body.options;
  }

  if (!template) {
    return res.status(400).json({ success: false, error: 'Missing required field: "template"' });
  }

  try {
    const pdfBuffer = await pdfService.generateFromTemplate(template, data || {}, options);
    sendPdfResponse(res, pdfBuffer, req);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to generate PDF from template', details: error.message });
  }
};



router.route('/generate/invoice')
  .post(handleInvoiceGenerate)
  .get(handleInvoiceGenerate);

router.route('/generate/html')
  .post(handleHtmlGenerate)
  .get(handleHtmlGenerate);

router.route('/generate/url')
  .post(handleUrlGenerate)
  .get(handleUrlGenerate);

router.route('/generate/markdown')
  .post(handleMarkdownGenerate)
  .get(handleMarkdownGenerate);

router.route('/generate/template')
  .post(handleTemplateGenerate)
  .get(handleTemplateGenerate);

router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    authRequired: !!process.env.API_KEY,
    endpoints: [
      'GET/POST /api/v1/generate/invoice',
      'GET/POST /api/v1/generate/html',
      'GET/POST /api/v1/generate/url',
      'GET/POST /api/v1/generate/markdown',
      'GET/POST /api/v1/generate/template'
    ]
  });
});

module.exports = router;
