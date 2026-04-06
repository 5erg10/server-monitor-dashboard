const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const passport = require('passport');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');

require('./auth/passport'); // init passport strategies

const authRoutes = require('./api/routes/auth');
const metricsRoutes = require('./api/routes/metrics');
const dockerRoutes = require('./api/routes/docker');
const logsRoutes = require('./api/routes/logs');
const alertsRoutes = require('./api/routes/alerts');
const { requireAuth } = require('./middleware/requireAuth');

const app = express();

// Trust the first proxy (Nginx Proxy Manager)
app.set('trust proxy', 1);

// Security
app.use(helmet({ contentSecurityPolicy: false }));

// CORS
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
});
app.use('/api', limiter);

// Body parsing
app.use(express.json());
app.use(cookieParser());

// Session (needed for OAuth flow)
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.CLIENT_URL?.startsWith('https'),
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
}));

// Passport
app.use(passport.initialize());
app.use(passport.session());

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/metrics', requireAuth, metricsRoutes);
app.use('/api/docker', requireAuth, dockerRoutes);
app.use('/api/logs', requireAuth, logsRoutes);
app.use('/api/alerts', requireAuth, alertsRoutes);

// Health check (public)
app.get('/api/health', (req, res) => res.json({ status: 'ok', ts: Date.now() }));

// Serve React static build if the public directory exists (production/Docker)
const publicPath = path.join(__dirname, '../../public');
if (fs.existsSync(path.join(publicPath, 'index.html'))) {
  app.use(express.static(publicPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
  });
}

module.exports = app;
