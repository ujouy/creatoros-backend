const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const axios = require('axios');
const auth = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

// Google OAuth initiation
router.get('/google', auth, (req, res) => {
  try {
    // Create state token with user ID
    const state = jwt.sign(
      { userId: req.user._id, platform: 'google' },
      process.env.JWT_SECRET,
      { expiresIn: '10m' }
    );

    const googleAuthUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' +
      `client_id=${process.env.GOOGLE_CLIENT_ID}&` +
      'redirect_uri=' + encodeURIComponent(process.env.GOOGLE_REDIRECT_URI) + '&' +
      'response_type=code&' +
      'scope=' + encodeURIComponent('openid profile email https://www.googleapis.com/auth/youtube.readonly') + '&' +
      'access_type=offline&' +
      'prompt=consent&' +
      `state=${state}`;

    res.json({
      success: true,
      authUrl: googleAuthUrl
    });

  } catch (error) {
    console.error('Google OAuth initiation error:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: 'Failed to initiate Google authentication.' 
    });
  }
});

// Google OAuth callback
router.post('/google/callback', async (req, res) => {
  try {
    const { code, state } = req.body;

    if (!code || !state) {
      return res.status(400).json({ 
        error: 'Missing parameters',
        message: 'Authorization code and state are required.' 
      });
    }

    // Verify state token
    let decoded;
    try {
      decoded = jwt.verify(state, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(400).json({ 
        error: 'Invalid state',
        message: 'Invalid or expired state token.' 
      });
    }

    // Exchange code for tokens
    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: process.env.GOOGLE_REDIRECT_URI
    });

    const { access_token, refresh_token } = tokenResponse.data;

    // Get user profile
    const profileResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });

    // Update user with Google tokens and profile
    const user = await User.findByIdAndUpdate(
      decoded.userId,
      {
        'google.accessToken': access_token,
        'google.refreshToken': refresh_token,
        'google.profile': {
          id: profileResponse.data.id,
          email: profileResponse.data.email,
          name: profileResponse.data.name,
          picture: profileResponse.data.picture
        },
        'google.connectedAt': new Date()
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        message: 'User account not found.' 
      });
    }

    res.json({
      success: true,
      message: 'Google account connected successfully',
      platform: 'google',
      profile: {
        name: profileResponse.data.name,
        email: profileResponse.data.email,
        picture: profileResponse.data.picture
      }
    });

  } catch (error) {
    console.error('Google OAuth callback error:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: 'Failed to complete Google authentication.' 
    });
  }
});

// X (Twitter) OAuth initiation
router.get('/x', auth, (req, res) => {
  try {
    // Generate code verifier and challenge for PKCE
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

    // Create state token with user ID and code verifier
    const state = jwt.sign(
      { 
        userId: req.user._id, 
        platform: 'x',
        codeVerifier 
      },
      process.env.JWT_SECRET,
      { expiresIn: '10m' }
    );

    const xAuthUrl = 'https://twitter.com/i/oauth2/authorize?' +
      `response_type=code&` +
      `client_id=${process.env.X_CLIENT_ID}&` +
      'redirect_uri=' + encodeURIComponent(process.env.X_REDIRECT_URI) + '&' +
      'scope=' + encodeURIComponent('tweet.read users.read follows.read offline.access') + '&' +
      `state=${state}&` +
      `code_challenge=${codeChallenge}&` +
      'code_challenge_method=S256';

    res.json({
      success: true,
      authUrl: xAuthUrl
    });

  } catch (error) {
    console.error('X OAuth initiation error:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: 'Failed to initiate X authentication.' 
    });
  }
});

// X (Twitter) OAuth callback
router.post('/x/callback', async (req, res) => {
  try {
    const { code, state } = req.body;

    if (!code || !state) {
      return res.status(400).json({ 
        error: 'Missing parameters',
        message: 'Authorization code and state are required.' 
      });
    }

    // Verify state token and extract code verifier
    let decoded;
    try {
      decoded = jwt.verify(state, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(400).json({ 
        error: 'Invalid state',
        message: 'Invalid or expired state token.' 
      });
    }

    // Exchange code for tokens using PKCE
    const tokenResponse = await axios.post('https://api.twitter.com/2/oauth2/token', 
      new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        client_id: process.env.X_CLIENT_ID,
        redirect_uri: process.env.X_REDIRECT_URI,
        code_verifier: decoded.codeVerifier
      }), 
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${process.env.X_CLIENT_ID}:${process.env.X_CLIENT_SECRET}`).toString('base64')}`
        }
      }
    );

    const { access_token, refresh_token } = tokenResponse.data;

    // Get user profile
    const profileResponse = await axios.get('https://api.twitter.com/2/users/me?user.fields=profile_image_url,public_metrics', {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });

    const profile = profileResponse.data.data;

    // Update user with X tokens and profile
    const user = await User.findByIdAndUpdate(
      decoded.userId,
      {
        'x.accessToken': access_token,
        'x.refreshToken': refresh_token,
        'x.profile': {
          id: profile.id,
          username: profile.username,
          name: profile.name,
          profileImage: profile.profile_image_url
        },
        'x.connectedAt': new Date()
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        message: 'User account not found.' 
      });
    }

    res.json({
      success: true,
      message: 'X account connected successfully',
      platform: 'x',
      profile: {
        username: profile.username,
        name: profile.name,
        profileImage: profile.profile_image_url
      }
    });

  } catch (error) {
    console.error('X OAuth callback error:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: 'Failed to complete X authentication.' 
    });
  }
});

module.exports = router;