require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');
const apiRoutes = require('./src/routes/api');

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
