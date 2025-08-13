// creatoros-backend/routes/integrations.js

const express = require('express');
const router = express.Router();
const { OAuth2Client } = require('google-auth-library');
const { TwitterApi } = require('twitter-api-v2');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middleware/auth');
const User = require('../models/User');

// --- SHARED CONFIGURATION ---
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_string_12345';

// =================================================================
// GOOGLE INTEGRATION
// =================================================================
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = 'https://creatoros-backend.onrender.com/api/integrations/google/callback';

const oAuth2Client = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);

router.get('/google', authMiddleware, (req, res) => {
  const token = req.header('x-auth-token') || req.query.token;
  const authorizeUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/youtube.readonly', 'https://www.googleapis.com/auth/yt-analytics.readonly'],
    prompt: 'consent',
    state: token
  });
  res.redirect(authorizeUrl);
});

router.get('/google/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!state) return res.status(401).json({ msg: 'State token is missing' });
    
    const decoded = jwt.verify(state, JWT_SECRET);
    const userId = decoded.user.id;
    
    const { tokens } = await oAuth2Client.getToken(code);
    
    await User.findByIdAndUpdate(userId, {
      'google.accessToken': tokens.access_token,
      'google.refreshToken': tokens.refresh_token,
      'google.expiryDate': tokens.expiry_date,
    });
    
    res.redirect('https://creatoros-frontend.vercel.app/app/dashboard');
  } catch (err) {
    console.error('Error during Google OAuth callback:', err);
    res.status(500).send('Server Error');
  }
});

// =================================================================
// X / TWITTER INTEGRATION
// =================================================================
const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID;
const TWITTER_CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET;
const TWITTER_REDIRECT_URI = 'https://creatoros-backend.onrender.com/api/integrations/twitter/callback';

const twitterClient = new TwitterApi({
  clientId: TWITTER_CLIENT_ID,
  clientSecret: TWITTER_CLIENT_SECRET,
});

router.get('/twitter', authMiddleware, (req, res) => {
    const token = req.header('x-auth-token') || req.query.token;
    const { url, codeVerifier, state } = twitterClient.generateOAuth2AuthLink(
        TWITTER_REDIRECT_URI,
        { 
            scope: ['tweet.read', 'users.read', 'offline.access'],
            state: token // Pass our JWT in the state
        }
    );
    // We need to temporarily store the codeVerifier to use in the callback
    // In a real app, you'd store this in the user's session or a temporary DB entry
    // For simplicity, we'll just log it for now. A more robust solution is needed for production.
    console.log(`Twitter codeVerifier for user: ${codeVerifier}`);
    // A robust solution would be to save this verifier associated with the user state
    // For now, this example will need a way to retrieve this in the callback.
    // A temporary solution could be to pass it in the state, but that's not ideal.
    // Let's use a simple in-memory store for this example.
    req.app.locals[state] = codeVerifier;

    res.redirect(url);
});

router.get('/twitter/callback', async (req, res) => {
    try {
        const { state, code } = req.query;
        const codeVerifier = req.app.locals[state];

        if (!state || !code || !codeVerifier) {
            return res.status(400).send('You denied the app or your session expired!');
        }
        
        const decoded = jwt.verify(state, JWT_SECRET);
        const userId = decoded.user.id;
        
        const { client: loggedClient, accessToken, refreshToken, expiresIn } = await twitterClient.loginWithOAuth2({
            code,
            codeVerifier,
            redirectUri: TWITTER_REDIRECT_URI,
        });

        const expiryDate = Date.now() + (expiresIn * 1000);

        await User.findByIdAndUpdate(userId, {
            'twitter.accessToken': accessToken,
            'twitter.refreshToken': refreshToken,
            'twitter.expiryDate': expiryDate,
        });
        
        // Clean up the temporary store
        delete req.app.locals[state];

        res.redirect('https://creatoros-frontend.vercel.app/app/dashboard');

    } catch (err) {
        console.error('Error during Twitter OAuth callback:', err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
