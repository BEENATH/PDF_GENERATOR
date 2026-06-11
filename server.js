require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');
const apiRoutes = require('./src/routes/api');

// 💡 PDF එක ජනනය කරන සර්විස් එක මෙතැනට Import කරගන්නවා
const pdfService = require('./src/services/pdfService'); 

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all origins (important for client-side API integrations)
app.use(cors({
  exposedHeaders: ['Content-Disposition']
}));

// Logger middleware
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Body parser with size limits for large HTML and base64 assets
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static website directory (for Dashboard/API playground)
app.use(express.static(path.join(__dirname, 'public')));
app.use('/src/templates', express.static(path.join(__dirname, 'src', 'templates')));


// =========================================================================
// ⭐ බ්‍රවුසර් එකෙන් කෙලින්ම PDF එක බලන්න හදපු නිවැරදි කෝඩ් එක ⭐
// =========================================================================
app.get('/view-pdf', async (req, res) => {
    try {
        // බ්‍රවුසර් එකේ URL එකෙන් දත්ත ටික ලබා ගැනීම
        const { invoiceNumber, companyName, dueDate, billingAddress } = req.query;

        // දත්ත ටික සරල ලස්සන HTML එකකට සකසා ගැනීම
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: sans-serif; padding: 40px; color: #333; }
                    .invoice-box { max-width: 800px; margin: auto; border: 1px solid #eee; padding: 30px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.15); }
                    h1 { color: #2c3e50; margin-bottom: 0; }
                    .details { margin-top: 20px; margin-bottom: 40px; }
                    .details p { margin: 5px 0; }
                    .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #777; }
                </style>
            </head>
            <body>
                <div class="invoice-box">
                    <h1>INVOICE</h1>
                    <hr>
                    <div class="details">
                        <p><strong>Invoice Number:</strong> ${invoiceNumber || 'INV-0000'}</p>
                        <p><strong>Company Name:</strong> ${companyName || 'Default Company'}</p>
                        <p><strong>Due Date:</strong> ${dueDate || new Date().toLocaleDateString()}</p>
                        <p><strong>Billing Address:</strong> ${billingAddress || 'Not Provided'}</p>
                    </div>
                    <div class="footer">
                        Generated via PDF API Webservice
                    </div>
                </div>
            </body>
            </html>
        `;

        // 💡 pdfService එකේ තියෙන නිවැරදිම function එක (generateFromHtml) මෙතනදී call කරනවා
        const pdfBuffer = await pdfService.generateFromHtml(htmlContent);

        // බ්‍රවුසර් එකට PDF එකක් බව හැඟවීමට headers සකස් කිරීම
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename=invoice.pdf'); 

        // PDF එක බ්‍රවුසර් එකට සෘජුවම යැවීම
        res.send(pdfBuffer);

    } catch (error) {
        console.error('PDF View Error:', error);
        res.status(500).send('Error generating PDF view: ' + error.message);
    }
});
// =========================================================================


// Configure rate limiting to protect endpoints
const limiterWindowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000; // 15 mins default
const limiterMax = parseInt(process.env.RATE_LIMIT_MAX) || 100; // 100 reqs default

const apiLimiter = rateLimit({
  windowMs: limiterWindowMs,
  max: limiterMax,
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Apply rate limiting to all generate requests
app.use('/api/v1/generate', apiLimiter);

// Mount API routes
app.use('/api/v1', apiRoutes);

// Root path fallback - serves the dashboard
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: err.message
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`  PDF Generator API Webservice successfully started`);
  console.log(`  Local Address: http://localhost:${PORT}`);
  console.log(`  Active Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`  API Key Auth: ${process.env.API_KEY ? 'ENABLED' : 'DISABLED'}`);
  console.log(`====================================================`);
});