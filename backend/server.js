// ============================================================
// server.js — Ecom Platform Backend Entry Point
// Company: Webon Ecomm Private Limited
// ============================================================

require('dotenv').config();

const express       = require('express');
const http          = require('http');
const cors          = require('cors');
const helmet        = require('helmet');
const morgan        = require('morgan');
const { Server }    = require('socket.io');
const mysql         = require('mysql2/promise');

// ── Route imports ─────────────────────────────────────────
const authRoutes    = require('./routes/auth');
const agoraRoutes   = require('./routes/agora');
const shopRoutes    = require('./routes/shops');
const productRoutes = require('./routes/products');
const liveRoutes    = require('./routes/live');
const callRoutes    = require('./routes/calls');
const cartRoutes    = require('./routes/cart');
const orderRoutes   = require('./routes/orders');
const paymentRoutes = require('./routes/payments');
const uploadRoutes  = require('./routes/upload');

// ── Socket handler ────────────────────────────────────────
const registerSocketHandlers = require('./sockets/socketHandlers');

// ============================================================
// 1. MySQL Connection Pool
// ============================================================
const pool = mysql.createPool({
  host:               process.env.MYSQL_HOST     || 'localhost',
  port:               parseInt(process.env.MYSQL_PORT || '3306'),
  user:               process.env.MYSQL_USER     || 'root',
  password:           process.env.MYSQL_PASSWORD || '',
  database:           process.env.MYSQL_DATABASE || 'ecom_db',
  waitForConnections: true,
  connectionLimit:    20,
  queueLimit:         0,
  timezone:           '+00:00',
});

// Test connection on startup
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log('✅  MySQL connected — database:', process.env.MYSQL_DATABASE);
    conn.release();
  } catch (err) {
    console.error('❌  MySQL connection failed:', err.message);
    process.exit(1);
  }
})();

// Attach pool to global so every module can import it
global.db = pool;

// ============================================================
// 2. Express App
// ============================================================
const app = express();

// ── Security & logging ────────────────────────────────────
app.use(helmet());
app.use(morgan('dev'));

// ── CORS ─────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');
app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (Postman, mobile apps)
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Body parsing ──────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================================
// 3. Routes
// ============================================================
app.use('/api/auth',     authRoutes);
app.use('/api/agora',    agoraRoutes);
app.use('/api/shops',    shopRoutes);
app.use('/api/products', productRoutes);
app.use('/api/live',     liveRoutes);
app.use('/api/calls',    callRoutes);
app.use('/api/cart',     cartRoutes);
app.use('/api/orders',   orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/upload',   uploadRoutes);

// ── Health check ──────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── 404 handler ───────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── Global error handler ──────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

// ============================================================
// 4. HTTP Server + Socket.io
// ============================================================
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout:  60000,
  pingInterval: 25000,
});

// Attach io to app so routes can access it
app.set('io', io);

// Register all socket event handlers
registerSocketHandlers(io);

// ============================================================
// 5. Start server
// ============================================================
const PORT = parseInt(process.env.PORT || '5000');

httpServer.listen(PORT, () => {
  console.log(`🚀  Ecom backend running on port ${PORT}`);
  console.log(`   REST API → http://localhost:${PORT}/api`);
  console.log(`   Socket.io ready`);
});
