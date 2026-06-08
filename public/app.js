// ─── Sample Content ───────────────────────────────────────────────────────────
const SAMPLES = {
  html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body{font-family:-apple-system,sans-serif;margin:0;padding:50px;background:linear-gradient(135deg,#1e293b,#0f172a);color:#f8fafc;min-height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center}
    .card{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:50px;max-width:600px;box-shadow:0 20px 50px rgba(0,0,0,0.3)}
    h1{font-size:36px;margin-bottom:14px;background:linear-gradient(135deg,#38bdf8,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-weight:800}
    p{color:#94a3b8;font-size:16px;line-height:1.6;margin-bottom:24px}
    .badge{display:inline-block;background:rgba(56,189,248,0.1);color:#38bdf8;border:1px solid rgba(56,189,248,0.2);padding:6px 16px;border-radius:20px;font-weight:600;font-size:13px}
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Puppeteer PDF Engine</div>
    <h1>AeroPDF Generation</h1>
    <p>Generated from raw HTML. Supports CSS, Flexbox, Google Fonts, gradients, and modern layouts — rendered pixel-perfect via headless Chrome.</p>
    <small style="color:#475569">AeroPDF Web Service API</small>
  </div>
</body>
</html>`,
  markdown: `# Project Report — Q2 2026

This document was generated from **Markdown** via the AeroPDF API.

## Key Highlights

- **Revenue**: $1.4M (↑ 22% QoQ)
- **API Calls**: 2.3M requests served
- **Uptime**: 99.97% availability

## Performance Table

| Metric | Target | Actual | Status |
|:---|:---:|:---:|:---:|
| PDF Render Time | < 800ms | 340ms | ✅ Pass |
| Error Rate | < 0.1% | 0.03% | ✅ Pass |
| API Latency (p99) | < 200ms | 142ms | ✅ Pass |

> All systems nominal. No incidents in Q2.

### Next Steps
1. Launch certificate template
2. Add webhook delivery support
3. Roll out EU data-residency region
`,
  templateData: {
    invoice: {
      companyName:"Stellar Cloud Ltd",companyAddress:"100 Innovation Way, CA 94016",companyEmail:"billing@stellar.io",invoiceNumber:"INV-2026-089",invoiceDate:"June 5, 2026",dueDate:"July 5, 2026",clientName:"CyberDyne Inc",clientAddress:"742 Evergreen Terrace, OR 97477",clientEmail:"accounts@cyberdyne.com",paymentMethod:"Bank Wire",taxRate:8,subtotal:5120,taxAmount:409.60,total:5529.60,items:[{name:"Cloud Hosting",description:"May 2026 usage",quantity:1,price:"3500.00",amount:"3500.00"},{name:"Consultation",description:"5 hours architecture review",quantity:5,price:"250.00",amount:"1250.00"},{name:"SLA Add-on",description:"24/7 Priority Support",quantity:1,price:"370.00",amount:"370.00"}]
    },
    certificate: {
      issuerName:"AEROCODING ACADEMY",recipientName:"Jonathan Thorne",courseTitle:"Full-Stack Web Architecture",instructorName:"Sarah Connor",issueDate:"June 5, 2026",certificateId:"ACA-2026-88741"
    },
    resume: {
      initials:"TL",fullName:"Timothy L. Mercer",professionalTitle:"Lead DevOps Engineer",phone:"+1 (555) 019-2834",email:"timothy@devops.io",location:"San Francisco, CA",website:"github.com/tmercer",skills:["Node.js","Puppeteer","Docker","Kubernetes","AWS","TypeScript"],languages:[{name:"English",level:"Native"},{name:"German",level:"Professional"}],summary:"DevOps Engineer with 6+ years designing scalable APIs and PDF microservices.",experience:[{role:"Senior Cloud Specialist",company:"Apex Tech",duration:"2023–Present",highlights:["Built invoice PDF engine serving 100k+ requests/month","Managed 50+ microservices on Kubernetes"]}],education:[{degree:"B.S. Computer Science",school:"UC Berkeley",duration:"2016–2020"}]
    }
  }
};

// ─── State ────────────────────────────────────────────────────────────────────
const state = {
  activePage: 'playground',
  activeTab: 'html',
  activeCodeLang: 'curl',
  invCodeLang: 'curl',
  invItems: []
};

// ─── DOM Helpers ──────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);

// ─── Init ─────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  $('baseUrlDisplay').textContent = window.location.origin;

  // Extract API key from URL query parameters
  const urlParams = new URLSearchParams(window.location.search);
  const urlKey = urlParams.get('apiKey') || urlParams.get('key') || urlParams.get('api_key');
  
  if (urlKey) {
    $('apiKeyInput').value = urlKey;
    localStorage.setItem('pdf_api_key', urlKey);
  } else {
    // Load from localStorage if present
    const cachedKey = localStorage.getItem('pdf_api_key');
    if (cachedKey) {
      $('apiKeyInput').value = cachedKey;
    }
  }

  $('htmlInput').value = SAMPLES.html;
  $('markdownInput').value = SAMPLES.markdown;
  populateTemplateSelect();
  addInvoiceItem();  // start with one blank item
  addInvoiceItem();  // and a second
  prefillSampleItems();
  checkHealth();
  bindEvents();
  updateCodeSnippet();
  updateInvCodeSnippet();
});

async function checkHealth() {
  try {
    const r = await fetch('/api/v1/health');
    if (r.ok) {
      const d = await r.json();
      const badge = $('authBadge');
      if (!d.authRequired) {
        badge.textContent = '🔓 Open Access';
        badge.classList.add('open');
      } else {
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (!isLocalhost && $('apiKeyInput').value === 'pdf_dev_key_abc123') {
          // Clear default dev key on production to prevent 401 errors
          $('apiKeyInput').value = '';
          localStorage.removeItem('pdf_api_key');
          updateCodeSnippet();
          updateInvCodeSnippet();
        }
      }
    }
  } catch {}
}

// ─── Template Select ──────────────────────────────────────────────────────────
function populateTemplateSelect() {
  const sel = $('templateSelect');
  sel.innerHTML = `
    <option value="invoice">Professional Invoice</option>
    <option value="certificate">Achievement Certificate</option>
    <option value="resume">Modern Resume</option>
  `;
  loadTemplateData('invoice');
  sel.addEventListener('change', (e) => loadTemplateData(e.target.value));
}

function loadTemplateData(name) {
  $('templateDataInput').value = JSON.stringify(SAMPLES.templateData[name] || {}, null, 2);
  updateCodeSnippet();
}

// ─── Invoice Line Items ───────────────────────────────────────────────────────
function addInvoiceItem(name = '', desc = '', qty = 1, price = 0) {
  const id = Date.now() + Math.random();
  state.invItems.push({ id, name, desc, qty, price });
  renderItems();
}

function removeInvoiceItem(id) {
  state.invItems = state.invItems.filter(i => i.id !== id);
  renderItems();
  updateInvCodeSnippet();
}

function renderItems() {
  const list = $('itemsList');
  if (state.invItems.length === 0) {
    list.innerHTML = '<div style="text-align:center;padding:16px;color:var(--text-muted);font-size:13px;">No items yet. Click + Add Item.</div>';
    return;
  }

  const header = `<div class="items-header"><span>Item</span><span>Qty</span><span>Unit Price</span><span></span></div>`;
  const rows = state.invItems.map(item => `
    <div class="item-row" data-id="${item.id}">
      <input type="text" placeholder="Item name…" value="${item.name}" data-field="name" onchange="updateItem(${item.id},'name',this.value)" oninput="updateItem(${item.id},'name',this.value)">
      <input type="number" placeholder="1" value="${item.qty}" min="0" data-field="qty" onchange="updateItem(${item.id},'qty',this.value)" oninput="updateItem(${item.id},'qty',this.value)">
      <input type="number" placeholder="0.00" value="${item.price}" min="0" step="0.01" data-field="price" onchange="updateItem(${item.id},'price',this.value)" oninput="updateItem(${item.id},'price',this.value)">
      <button class="btn-remove-item" onclick="removeInvoiceItem(${item.id})" title="Remove">×</button>
    </div>
  `).join('');

  list.innerHTML = header + rows;
  updateInvCodeSnippet();
}

function updateItem(id, field, value) {
  const item = state.invItems.find(i => i.id === id);
  if (item) {
    item[field] = field === 'qty' || field === 'price' ? parseFloat(value) || 0 : value;
    updateInvCodeSnippet();
  }
}

function prefillSampleItems() {
  if (state.invItems.length >= 1) {
    state.invItems[0] = { ...state.invItems[0], name: 'Web Development', desc: 'Frontend build — React app', qty: 10, price: 150 };
  }
  if (state.invItems.length >= 2) {
    state.invItems[1] = { ...state.invItems[1], name: 'API Integration', desc: 'PDF service setup', qty: 5, price: 120 };
  }
  renderItems();
}

// ─── Collect Invoice Payload ──────────────────────────────────────────────────
function getInvoicePayload(isDownload = false) {
  return {
    from: {
      company: $('inv-from-company').value,
      email: $('inv-from-email').value,
      phone: $('inv-from-phone').value,
      address: $('inv-from-address').value,
      taxId: $('inv-from-taxid').value
    },
    to: {
      name: $('inv-to-name').value,
      email: $('inv-to-email').value,
      address: $('inv-to-address').value
    },
    invoiceNumber: $('inv-number').value,
    invoiceDate: $('inv-date').value,
    dueDate: $('inv-due').value,
    currency: 'USD',
    currencySymbol: $('inv-currency-symbol').value,
    taxRate: parseFloat($('inv-tax').value) || 0,
    discountRate: parseFloat($('inv-discount').value) || 0,
    paymentMethod: $('inv-payment').value,
    notes: $('inv-notes').value,
    accentColor: $('inv-color').value,
    logoUrl: $('inv-logo-url').value,
    logoWidth: $('inv-logo-width').value,
    fontFamily: $('inv-font-family').value,
    items: state.invItems.map(i => ({
      name: i.name,
      description: i.desc,
      quantity: i.qty,
      unitPrice: i.price
    })),
    filename: `invoice-${$('inv-number').value || 'document'}.pdf`,
    download: isDownload
  };
}

// ─── Generate PDF ─────────────────────────────────────────────────────────────
async function generatePdf(endpoint, bodyData, loaderEl, placeholderEl, iframeEl, perfMetricEl, perfValEl) {
  loaderEl.style.display = 'flex';
  perfMetricEl.style.display = 'none';
  const t0 = performance.now();
  const apiKey = $('apiKeyInput').value.trim();
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

  try {
    const res = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(bodyData) });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const errMsg = err.details ? `${err.error}: ${err.details}` : (err.error || `HTTP ${res.status}`);
      throw new Error(errMsg);
    }
    const blob = await res.blob();
    const ms = Math.round(performance.now() - t0);
    perfValEl.textContent = ms;
    perfMetricEl.style.display = 'inline-block';
    return blob;
  } finally {
    loaderEl.style.display = 'none';
  }
}

async function handlePlaygroundAction(isDownload) {
  const tab = state.activeTab;
  // 'templates' is the UI tab name; the actual endpoint path is 'template' (singular)
  const endpointSlug = tab === 'templates' ? 'template' : tab;
  let endpoint = `/api/v1/generate/${endpointSlug}`;
  const body = { download: isDownload, options: getPlaygroundOptions() };

  if (tab === 'html') body.html = $('htmlInput').value;
  else if (tab === 'url') body.url = $('urlInput').value;
  else if (tab === 'markdown') body.markdown = $('markdownInput').value;
  else if (tab === 'templates') {
    try {
      const tmplName = $('templateSelect').value;
      const r = await fetch(`/src/templates/${tmplName}.html`);
      if (!r.ok) throw new Error('Could not load template file');
      body.template = await r.text();
      body.data = JSON.parse($('templateDataInput').value);
    } catch(e) { alert('Error: ' + e.message); return; }
  }

  body.filename = $('pdfFilename').value || 'document.pdf';

  try {
    const blob = await generatePdf(endpoint, body, $('loaderOverlay'), $('previewPlaceholder'), $('pdfIframe'), $('perfMetric'), $('perfVal'));
    const url = URL.createObjectURL(blob);
    if (isDownload) {
      const a = document.createElement('a'); a.href = url; a.download = body.filename;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } else {
      $('previewPlaceholder').style.display = 'none';
      $('pdfIframe').style.display = 'block';
      $('pdfIframe').src = url;
    }
  } catch(e) { alert('PDF generation failed: ' + e.message); }
}

async function handleInvoiceAction(isDownload) {
  const payload = getInvoicePayload(isDownload);
  if (!payload.items.length || payload.items.every(i => !i.name)) {
    alert('Please add at least one line item with a name.'); return;
  }

  try {
    const blob = await generatePdf(
      '/api/v1/generate/invoice', payload,
      $('invLoaderOverlay'), $('invPreviewPlaceholder'), $('invPdfIframe'),
      $('invPerfMetric'), $('invPerfVal')
    );
    const url = URL.createObjectURL(blob);
    if (isDownload) {
      const a = document.createElement('a'); a.href = url; a.download = payload.filename;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } else {
      $('invPreviewPlaceholder').style.display = 'none';
      $('invPdfIframe').style.display = 'block';
      $('invPdfIframe').src = url;
    }
  } catch(e) { alert('Invoice generation failed: ' + e.message); }
}

// ─── Options ──────────────────────────────────────────────────────────────────
function getPlaygroundOptions() {
  return {
    format: $('pdfFormat').value,
    landscape: $('pdfOrientation').value === 'true',
    scale: parseFloat($('pdfScale').value) || 1,
    marginTop: $('marginTop').value || '15mm',
    marginBottom: $('marginBottom').value || '15mm',
    marginLeft: $('marginLeft').value || '15mm',
    marginRight: $('marginRight').value || '15mm',
    printBackground: $('printBackground').checked
  };
}

// ─── Code Snippets ────────────────────────────────────────────────────────────
function updateCodeSnippet() {
  const host = (window.location.origin === 'null' || !window.location.origin) ? 'http://localhost:3000' : window.location.origin;
  // 'templates' is the UI tab name; the actual endpoint path is 'template' (singular)
  const endpointSlug = state.activeTab === 'templates' ? 'template' : state.activeTab;
  const endpoint = `${host}/api/v1/generate/${endpointSlug}`;
  const apiKey = $('apiKeyInput').value.trim() || 'YOUR_API_KEY';
  const body = { options: { format: 'A4' } };

  if (state.activeTab === 'html') body.html = '<html><body><h1>Hello World</h1></body></html>';
  else if (state.activeTab === 'url') body.url = $('urlInput')?.value || 'https://example.com';
  else if (state.activeTab === 'markdown') body.markdown = '# Hello\n\n- Item 1\n- Item 2';
  else if (state.activeTab === 'templates') {
    body.template = `<html><body><h1>{{title}}</h1></body></html>`;
    body.data = { title: 'My Document' };
  }

  $('codeSnippet').textContent = buildSnippet(state.activeCodeLang, endpoint, apiKey, body, 'document.pdf');
}

function updateInvCodeSnippet() {
  const host = (window.location.origin === 'null' || !window.location.origin) ? 'http://localhost:3000' : window.location.origin;
  const endpoint = `${host}/api/v1/generate/invoice`;
  const apiKey = $('apiKeyInput').value.trim() || 'YOUR_API_KEY';
  const payload = getInvoicePayload(true);
  $('invCodeSnippet').textContent = buildSnippet(state.invCodeLang, endpoint, apiKey, payload, payload.filename);
}

function buildSnippet(lang, endpoint, apiKey, body, filename) {
  const bodyStr = JSON.stringify(body, null, 2);
  if (lang === 'curl') {
    return `curl -X POST "${endpoint}" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -d '${bodyStr.replace(/'/g, "'\\''")}' \\
  --output "${filename}"`;
  } else if (lang === 'javascript') {
    return `const response = await fetch('${endpoint}', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ${apiKey}'
  },
  body: JSON.stringify(${bodyStr.split('\n').join('\n  ')})
});

if (response.ok) {
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = '${filename}';
  document.body.appendChild(a); a.click(); a.remove();
} else {
  const err = await response.json();
  console.error('PDF Error:', err);
}`;
  } else if (lang === 'python') {
    return `import requests

url = "${endpoint}"
headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer ${apiKey}"
}

payload = ${JSON.stringify(body, null, 4).replace(/true/g, 'True').replace(/false/g, 'False').replace(/null/g, 'None')}

response = requests.post(url, json=payload, headers=headers)

if response.status_code == 200:
    with open("${filename}", "wb") as f:
        f.write(response.content)
    print("PDF saved to ${filename}")
else:
    print("Error:", response.json())`;
  }
  return '';
}

// ─── Event Bindings ───────────────────────────────────────────────────────────
function bindEvents() {
  // Page nav
  $$('.nav-btn').forEach(btn => btn.addEventListener('click', () => {
    $$('.nav-btn').forEach(b => b.classList.remove('active'));
    $$('.page').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    const pageId = `page-${btn.dataset.page}`;
    $(pageId)?.classList.add('active');
    state.activePage = btn.dataset.page;
  }));

  // API Key toggle
  $('toggleApiKey').addEventListener('click', () => {
    const inp = $('apiKeyInput');
    inp.type = inp.type === 'password' ? 'text' : 'password';
  });
  $('apiKeyInput').addEventListener('input', () => {
    const key = $('apiKeyInput').value.trim();
    if (key) {
      localStorage.setItem('pdf_api_key', key);
    } else {
      localStorage.removeItem('pdf_api_key');
    }
    updateCodeSnippet();
    updateInvCodeSnippet();
  });
  // Playground tabs
  $$('.tab-btn').forEach(btn => btn.addEventListener('click', () => {
    $$('.tab-btn').forEach(b => b.classList.remove('active'));
    $$('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    $(`panel-${btn.dataset.tab}`)?.classList.add('active');
    state.activeTab = btn.dataset.tab;
    updateCodeSnippet();
  }));

  // Playground resets
  $('loadSampleHtml')?.addEventListener('click', () => { $('htmlInput').value = SAMPLES.html; updateCodeSnippet(); });
  $('loadSampleMarkdown')?.addEventListener('click', () => { $('markdownInput').value = SAMPLES.markdown; updateCodeSnippet(); });

  // Settings accordion
  $('settingsToggle')?.addEventListener('click', () => {
    $('settingsContent').classList.toggle('collapsed');
    $('settingsChevron').classList.toggle('rotate');
  });

  // Playground actions
  $('btnPreview').addEventListener('click', () => handlePlaygroundAction(false));
  $('btnDownload').addEventListener('click', () => handlePlaygroundAction(true));

  // Playground code tabs
  $$('.code-tab-btn').forEach(btn => {
    const container = btn.closest('.code-integration-section');
    btn.addEventListener('click', () => {
      container.querySelectorAll('.code-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (container.closest('#page-playground')) {
        state.activeCodeLang = btn.dataset.lang; updateCodeSnippet();
      } else {
        state.invCodeLang = btn.dataset.lang; updateInvCodeSnippet();
      }
    });
  });

  // Copy buttons
  $$('.btn-copy').forEach(btn => {
    btn.addEventListener('click', () => {
      const code = btn.closest('.code-container').querySelector('.code-block').textContent;
      navigator.clipboard.writeText(code).then(() => {
        btn.textContent = 'Copied!'; btn.classList.add('copied');
        setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 2000);
      });
    });
  });

  // Invoice actions
  $('addItemBtn').addEventListener('click', () => addInvoiceItem());
  $('invBtnPreview').addEventListener('click', () => handleInvoiceAction(false));
  $('invBtnDownload').addEventListener('click', () => handleInvoiceAction(true));

  // Invoice form live code update
  ['inv-from-company','inv-from-email','inv-from-phone','inv-from-address','inv-from-taxid',
   'inv-to-name','inv-to-email','inv-to-address','inv-number','inv-currency-symbol',
   'inv-date','inv-due','inv-tax','inv-discount','inv-payment','inv-notes','inv-color',
   'inv-logo-url','inv-logo-width','inv-font-family'].forEach(id => {
    $(id)?.addEventListener('input', updateInvCodeSnippet);
    $(id)?.addEventListener('change', updateInvCodeSnippet);
  });

  // Inputs that affect playground snippet
  ['pdfFormat','pdfOrientation','pdfScale','pdfFilename','marginTop','marginBottom','marginLeft','marginRight','printBackground','urlInput']
    .forEach(id => $(id)?.addEventListener('input', updateCodeSnippet));
  ['pdfFormat','pdfOrientation'].forEach(id => $(id)?.addEventListener('change', updateCodeSnippet));
}
