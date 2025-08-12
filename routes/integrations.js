// creatoros-backend/routes/integrations.js

const express = require('express');
const router = express.Router();
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middleware/auth');
const User = require('../models/User');

// --- CONFIGURATION ---
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_string_12345';

// Use the live Render URL for the callback
const REDIRECT_URI = 'https://creatoros-backend.onrender.com/api/integrations/google/callback';

const oAuth2Client = new OAuth2Client(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  REDIRECT_URI
);

// --- ROUTE 1: Start the Authorization Process ---
router.get('/google', authMiddleware, (req, res) => {
  const token = req.header('x-auth-token') || req.query.token;

  const scopes = [
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/yt-analytics.readonly'
  ];

  const authorizeUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
    state: token
  });

  res.redirect(authorizeUrl);
});


// --- ROUTE 2: The Callback ---
router.get('/google/callback', async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!state) {
      return res.status(401).json({ msg: 'State token is missing, authorization denied.' });
    }

    const decoded = jwt.verify(state, JWT_SECRET);
    const userId = decoded.user.id;

    const { tokens } = await oAuth2Client.getToken(code);
    const { access_token, refresh_token, expiry_date } = tokens;

    await User.findByIdAndUpdate(userId, {
      'google.accessToken': access_token,
      'google.refreshToken': refresh_token,
      'google.expiryDate': expiry_date,
    });

    // Success! Redirect the user back to the live frontend on Vercel.
    // Replace the URL if your Vercel URL is different.
    res.redirect('https://creatoros-frontend.vercel.app/');

  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ msg: 'State token is not valid' });
    }
    console.error('Error during Google OAuth callback:', err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
