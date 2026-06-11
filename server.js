require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');
const apiRoutes = require('./src/routes/api');


const pdfService = require('./src/services/pdfService'); 

const app = express();
const PORT = process.env.PORT || 3000;


app.use(cors({
  exposedHeaders: ['Content-Disposition']
}));


app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));


app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));


app.use(express.static(path.join(__dirname, 'public')));
app.use('/src/templates', express.static(path.join(__dirname, 'src', 'templates')));





app.get('/view-pdf', async (req, res) => {
    try {
        
        const { invoiceNumber, companyName, dueDate, billingAddress } = req.query;

        
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

        
        const pdfBuffer = await pdfService.generateFromHtml(htmlContent);

        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename=invoice.pdf'); 

        
        res.send(pdfBuffer);

    } catch (error) {
        console.error('PDF View Error:', error);
        res.status(500).send('Error generating PDF view: ' + error.message);
    }
});




const limiterWindowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000; 
const limiterMax = parseInt(process.env.RATE_LIMIT_MAX) || 100; 

const apiLimiter = rateLimit({
  windowMs: limiterWindowMs,
  max: limiterMax,
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true, 
  legacyHeaders: false, 
});


app.use('/api/v1/generate', apiLimiter);


app.use('/api/v1', apiRoutes);


app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: err.message
  });
});


app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`  PDF Generator API Webservice successfully started`);
  console.log(`  Local Address: http://localhost:${PORT}`);
  console.log(`  Active Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`  API Key Auth: ${process.env.API_KEY ? 'ENABLED' : 'DISABLED'}`);
  console.log(`====================================================`);
});