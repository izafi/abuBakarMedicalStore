/**
 * Abu Bakar Medical Store - Pharmacy Inventory System
 * Backend Server Entry Point
 */
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const path = require('path');

// 1. Load Environment Variables First (both root and backEnd directory)
dotenv.config();
dotenv.config({ path: path.join(__dirname, '.env') });

// 2. Import Database Connection, Seeder & Middlewares
const connectDB = require('./config/db');
const seedInitialData = require('./config/seedData');
const apiRoutes = require('./routes');
const notFoundHandler = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

// 3. Initialize Express Application
const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// 4. Security Headers (Helmet)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// 5. CORS Configuration for React Frontend
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (e.g. mobile apps, curl, Postman) or matching frontend
    const allowedOrigins = [
      CLIENT_URL,
      'https://abubakarpharmacy.com',
      'http://abubakarpharmacy.com',
      'https://www.abubakarpharmacy.com',
      'http://www.abubakarpharmacy.com',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:3000',
    ];

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS Error: Origin '${origin}' is not allowed by policy.`));
    }
  },
  credentials: true, // Allow cookies & authorization headers
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Set-Cookie'],
  maxAge: 86400, // 24 hours preflight cache
};
app.use(cors(corsOptions));

// 6. HTTP Request Logging (Morgan)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// 7. Request Body Parsers & Cookie Parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// 8. API v1 Master Routes
app.use('/api/v1', apiRoutes);

// 9. Production Static Frontend Serving (if built admin dist exists)
const fs = require('fs');
const adminDistPath = path.join(__dirname, '../admin/dist');
const localDistPath = path.join(__dirname, 'public');

let staticPath = null;
if (fs.existsSync(adminDistPath)) {
  staticPath = adminDistPath;
} else if (fs.existsSync(localDistPath)) {
  staticPath = localDistPath;
}

if (staticPath) {
  app.use(express.static(staticPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(staticPath, 'index.html'));
  });
} else {
  // Root Welcome Route for pure API mode
  app.get('/', (req, res) => {
    res.status(200).json({
      success: true,
      name: 'Abu Bakar Medical Store API',
      tagline: 'Pharmacy Inventory System Backend',
      version: '1.0.0',
      documentation: '/api/v1',
      health: '/api/v1/health',
    });
  });
}

// 10. 404 Undefined Route Handler
app.use(notFoundHandler);

// 11. Centralized Global Error Handler
app.use(errorHandler);

// 12. Connect Database & Start Server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Seed initial demo records if database is empty
    await seedInitialData();

    const server = app.listen(PORT, () => {
      console.log('====================================================');
      console.log(`  Abu Bakar Medical Store - Backend Server Started  `);
      console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`  Server Port: ${PORT}`);
      console.log(`  Health API : http://localhost:${PORT}/api/v1/health`);
      console.log(`  Client CORS: ${CLIENT_URL}`);
      console.log('====================================================');
    });

    // Handle Unhandled Promise Rejections
    process.on('unhandledRejection', (err) => {
      console.error(`[Fatal] Unhandled Promise Rejection: ${err.message}`);
      if (err.stack) console.error(err.stack);
      server.close(() => process.exit(1));
    });

    // Handle Uncaught Exceptions
    process.on('uncaughtException', (err) => {
      console.error(`[Fatal] Uncaught Exception: ${err.message}`);
      if (err.stack) console.error(err.stack);
      server.close(() => process.exit(1));
    });
  } catch (err) {
    console.error(`Failed to launch server: ${err.message}`);
    process.exit(1);
  }
};

startServer();

module.exports = app;
