// creatoros-backend/routes/integrations.js

const express = require('express');
const router = express.Router();
const { OAuth2Client } = require('google-auth-library');
const { TwitterApi } = require('twitter-api-v2');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middleware/auth');
const User = require('../models/User');

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
// X INTEGRATION
// =================================================================
const X_CLIENT_ID = process.env.TWITTER_CLIENT_ID;
const X_CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET;
const X_REDIRECT_URI = 'https://creatoros-backend.onrender.com/api/integrations/x/callback';

const xClient = new TwitterApi({
  clientId: X_CLIENT_ID,
  clientSecret: X_CLIENT_SECRET,
});

router.get('/x', authMiddleware, (req, res) => {
    const token = req.header('x-auth-token') || req.query.token;
    
    const { url, codeVerifier } = xClient.generateOAuth2AuthLink(
        X_REDIRECT_URI,
        { 
            scope: ['tweet.read', 'users.read', 'offline.access']
        }
    );

    // Create a new JWT that includes the original user token AND the codeVerifier
    const statePayload = {
        jwt: token,
        codeVerifier: codeVerifier
    };
    const stateToken = jwt.sign(statePayload, JWT_SECRET);

    // Append our new composite state token to the URL
    const finalUrl = `${url}&state=${stateToken}`;

    res.redirect(finalUrl);
});

router.get('/x/callback', async (req, res) => {
    try {
        const { state, code } = req.query;

        if (!state || !code) {
            return res.status(400).send('You denied the app or the state/code is missing!');
        }
        
        // Decode the composite state token to get the original JWT and the codeVerifier
        const decodedState = jwt.verify(state, JWT_SECRET);
        const { jwt: userToken, codeVerifier } = decodedState;

        if (!codeVerifier) {
             return res.status(400).send('Invalid state: codeVerifier is missing.');
        }

        // Verify the original user JWT to get the user ID
        const decodedUser = jwt.verify(userToken, JWT_SECRET);
        const userId = decodedUser.user.id;
        
        const { accessToken, refreshToken, expiresIn } = await xClient.loginWithOAuth2({
            code,
            codeVerifier,
            redirectUri: X_REDIRECT_URI,
        });

        const expiryDate = Date.now() + (expiresIn * 1000);

        await User.findByIdAndUpdate(userId, {
            'x.accessToken': accessToken,
            'x.refreshToken': refreshToken,
            'x.expiryDate': expiryDate,
        });
        
        res.redirect('https://creatoros-frontend.vercel.app/app/dashboard');

    } catch (err) {
        console.error('Error during X OAuth callback:', err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
