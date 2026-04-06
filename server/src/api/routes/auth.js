const router = require('express').Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');

const CLIENT_URL = process.env.NODE_ENV === 'production'
  ? 'https://monitor.5erg10.com'
  : (process.env.CLIENT_URL || 'http://localhost:5173');

// Initiate Google OAuth
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
}));

// Google OAuth callback
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${CLIENT_URL}/login?error=unauthorized` }),
  (req, res) => {
    const token = jwt.sign(req.user, process.env.JWT_SECRET || 'dev-secret', {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.redirect(`${CLIENT_URL}/`);
  }
);

// Get current user
router.get('/me', (req, res) => {
  const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ user: null });

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    res.json({ user });
  } catch {
    res.status(401).json({ user: null });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

module.exports = router;
