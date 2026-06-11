const { fork } = require('child_process');
const assert = require('assert');
const path = require('path');

const PORT = 3001; // use separate port for testing to avoid conflicts
const API_KEY = 'pdf_test_key_xyz987';
const BASE_URL = `http://localhost:${PORT}/api/v1`;

let serverProcess = null;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function startServer() {
  return new Promise((resolve, reject) => {
    console.log('🔄 Starting test server...');
    
    serverProcess = fork(path.join(__dirname, 'server.js'), [], {
      env: {
        ...process.env,
        PORT: PORT,
        API_KEY: API_KEY,
        NODE_ENV: 'test'
      },
      silent: true // suppress console output from server during tests
    });

    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('successfully started')) {
        resolve();
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error('Server Stderr:', data.toString());
    });

    serverProcess.on('error', (err) => {
      reject(err);
    });

    setTimeout(resolve, 3000);
  });
}

function stopServer() {
  if (serverProcess) {
    console.log('⏹️ Stopping test server...');
    serverProcess.kill();
  }
}

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

test('GET /health - should return healthy state', async () => {
  const res = await fetch(`${BASE_URL}/health`);
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.status, 'healthy');
  assert.strictEqual(data.authRequired, true);
});

test('POST /generate/html - should reject request without API Key', async () => {
  const res = await fetch(`${BASE_URL}/generate/html`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ html: '<h1>Test</h1>' })
  });
  assert.strictEqual(res.status, 401);
  const data = await res.json();
  assert.strictEqual(data.success, false);
  assert.match(data.error, /Unauthorized/);
});

test('POST /generate/html - should generate PDF from HTML with correct API Key', async () => {
  const res = await fetch(`${BASE_URL}/generate/html`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      html: '<html><body><h1>Hello World</h1></body></html>',
      options: { format: 'A4' }
    })
  });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.headers.get('content-type'), 'application/pdf');
  
  const buffer = await res.arrayBuffer();
  const pdfHeader = String.fromCharCode(...new Uint8Array(buffer.slice(0, 4)));
  assert.strictEqual(pdfHeader, '%PDF'); // Valid PDFs start with %PDF
});

test('POST /generate/url - should generate PDF from URL with correct API Key', async () => {
  const res = await fetch(`${BASE_URL}/generate/url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      url: 'https://example.com',
      options: { format: 'Letter', landscape: true }
    })
  });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.headers.get('content-type'), 'application/pdf');
  
  const buffer = await res.arrayBuffer();
  const pdfHeader = String.fromCharCode(...new Uint8Array(buffer.slice(0, 4)));
  assert.strictEqual(pdfHeader, '%PDF');
});

test('POST /generate/markdown - should generate PDF from Markdown with correct API Key', async () => {
  const res = await fetch(`${BASE_URL}/generate/markdown`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      markdown: '# Document Title\n\n- Bullet 1\n- Bullet 2',
      options: { format: 'A4' }
    })
  });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.headers.get('content-type'), 'application/pdf');
  
  const buffer = await res.arrayBuffer();
  const pdfHeader = String.fromCharCode(...new Uint8Array(buffer.slice(0, 4)));
  assert.strictEqual(pdfHeader, '%PDF');
});

test('POST /generate/template - should generate PDF from compiled template and data', async () => {
  const res = await fetch(`${BASE_URL}/generate/template`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      template: '<html><body><h1>Hello {{name}}</h1></body></html>',
      data: { name: 'AeroPDF User' },
      options: { format: 'A4' }
    })
  });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.headers.get('content-type'), 'application/pdf');
  
  const buffer = await res.arrayBuffer();
  const pdfHeader = String.fromCharCode(...new Uint8Array(buffer.slice(0, 4)));
  assert.strictEqual(pdfHeader, '%PDF');
});

test('POST /generate/invoice - should generate PDF from invoice JSON data', async () => {
  const res = await fetch(`${BASE_URL}/generate/invoice`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      from: {
        company: 'AeroPDF Testing Inc',
        address: '123 Cloud Way',
        email: 'billing@aeropdf.dev'
      },
      to: {
        name: 'John Doe',
        email: 'john@example.com'
      },
      invoiceNumber: 'INV-2026-TEST',
      items: [
        { name: 'API Setup', description: 'Initial configuration', quantity: 1, unitPrice: 250 },
        { name: 'Monthly Service', description: 'June 2026 support', quantity: 2, unitPrice: 75 }
      ],
      taxRate: 5,
      discountRate: 10,
      currencySymbol: '$',
      accentColor: '#8b5cf6'
    })
  });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.headers.get('content-type'), 'application/pdf');
  
  const buffer = await res.arrayBuffer();
  const pdfHeader = String.fromCharCode(...new Uint8Array(buffer.slice(0, 4)));
  assert.strictEqual(pdfHeader, '%PDF');
});

test('GET /generate/html - should generate PDF from HTML query param and API Key', async () => {
  const html = encodeURIComponent('<html><body><h1>GET HTML</h1></body></html>');
  const res = await fetch(`${BASE_URL}/generate/html?html=${html}&apiKey=${API_KEY}`);

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.headers.get('content-type'), 'application/pdf');
  
  const buffer = await res.arrayBuffer();
  const pdfHeader = String.fromCharCode(...new Uint8Array(buffer.slice(0, 4)));
  assert.strictEqual(pdfHeader, '%PDF');
});

test('GET /generate/url - should generate PDF from url query param and API Key', async () => {
  const url = encodeURIComponent('https://example.com');
  const res = await fetch(`${BASE_URL}/generate/url?url=${url}&apiKey=${API_KEY}`);

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.headers.get('content-type'), 'application/pdf');
  
  const buffer = await res.arrayBuffer();
  const pdfHeader = String.fromCharCode(...new Uint8Array(buffer.slice(0, 4)));
  assert.strictEqual(pdfHeader, '%PDF');
});

test('GET /generate/markdown - should generate PDF from markdown query param and API Key', async () => {
  const markdown = encodeURIComponent('# GET Markdown\n\nSome text');
  const res = await fetch(`${BASE_URL}/generate/markdown?markdown=${markdown}&apiKey=${API_KEY}`);

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.headers.get('content-type'), 'application/pdf');
  
  const buffer = await res.arrayBuffer();
  const pdfHeader = String.fromCharCode(...new Uint8Array(buffer.slice(0, 4)));
  assert.strictEqual(pdfHeader, '%PDF');
});

test('GET /generate/template - should generate PDF from template and JSON data query param', async () => {
  const template = encodeURIComponent('<html><body><h1>Hello {{name}}</h1></body></html>');
  const data = encodeURIComponent(JSON.stringify({ name: 'GET User' }));
  const res = await fetch(`${BASE_URL}/generate/template?template=${template}&data=${data}&apiKey=${API_KEY}`);

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.headers.get('content-type'), 'application/pdf');
  
  const buffer = await res.arrayBuffer();
  const pdfHeader = String.fromCharCode(...new Uint8Array(buffer.slice(0, 4)));
  assert.strictEqual(pdfHeader, '%PDF');
});

test('GET /generate/invoice - should generate PDF from invoice query parameters', async () => {
  const items = encodeURIComponent(JSON.stringify([
    { name: 'GET Item', description: 'Item from query parameter', quantity: 1, unitPrice: 100 }
  ]));
  const res = await fetch(`${BASE_URL}/generate/invoice?items=${items}&invoiceNumber=INV-GET-123&apiKey=${API_KEY}`);

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.headers.get('content-type'), 'application/pdf');
  
  const buffer = await res.arrayBuffer();
  const pdfHeader = String.fromCharCode(...new Uint8Array(buffer.slice(0, 4)));
  assert.strictEqual(pdfHeader, '%PDF');
});

async function run() {
  let failed = 0;
  
  try {
    await startServer();

    await sleep(1000);
    
    console.log('\n🏃 Running API Integration Tests...\n');
    
    for (const t of tests) {
      try {
        await t.fn();
        console.log(`✅ [PASS] ${t.name}`);
      } catch (err) {
        console.error(`❌ [FAIL] ${t.name}`);
        console.error(err);
        failed++;
      }
    }
  } catch (err) {
    console.error('Failed to setup tests:', err);
    failed++;
  } finally {
    stopServer();
  }
  
  console.log('\n======================================');
  console.log(`📊 Test Results: ${tests.length - failed} passed, ${failed} failed`);
  console.log('======================================\n');
  
  process.exit(failed > 0 ? 1 : 0);
}

run();
