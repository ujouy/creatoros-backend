// creatoros-backend/routes/integrations.js

const express = require('express');
const router = express.Router();
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken'); // Import the jwt library
const authMiddleware = require('../middleware/auth');
const User = require('../models/User');

// --- CONFIGURATION ---
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3000/api/integrations/google/callback';
const JWT_SECRET = 'your_super_secret_string_12345'; // The same secret from your auth files

const oAuth2Client = new OAuth2Client(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  REDIRECT_URI
);

// --- ROUTE 1: Start the Authorization Process ---
// This route is still protected by the middleware to ensure a user is logged in.
router.get('/google', authMiddleware, (req, res) => {
  // Get the original token that the middleware verified.
  const token = req.header('x-auth-token') || req.query.token;

  const scopes = [
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/yt-analytics.readonly'
  ];

  // Generate the URL and pass our token in the 'state' parameter.
  const authorizeUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
    state: token // <-- This is the crucial change
  });

  res.redirect(authorizeUrl);
});


// --- ROUTE 2: The Callback ---
// The middleware is REMOVED from this route. We verify identity using the 'state' param.
router.get('/google/callback', async (req, res) => {
  try {
    // Get the 'code' from Google and the 'state' (our JWT) that Google passed back.
    const { code, state } = req.query;

    if (!state) {
      return res.status(401).json({ msg: 'State token is missing, authorization denied.' });
    }

    // Manually verify the JWT from the state parameter to identify the user.
    const decoded = jwt.verify(state, JWT_SECRET);
    const userId = decoded.user.id;

    // Exchange Google's code for actual tokens.
    const { tokens } = await oAuth2Client.getToken(code);
    const { access_token, refresh_token, expiry_date } = tokens;

    // Save these tokens to the correct user's record in the database.
    await User.findByIdAndUpdate(userId, {
      'google.accessToken': access_token,
      'google.refreshToken': refresh_token,
      'google.expiryDate': expiry_date,
    });

    // Success! Redirect the user back to the frontend dashboard.
    res.redirect('http://localhost:5173/');

  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ msg: 'State token is not valid' });
    }
    console.error('Error during Google OAuth callback:', err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;