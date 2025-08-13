// creatoros-backend/routes/analysis.js

const express = require('express');
const router = express.Router();
const axios = require('axios');
const { google } = require('googleapis');
const { TwitterApi } = require('twitter-api-v2');
const authMiddleware = require('../middleware/auth');
const User = require('../models/User');

// --- CONFIGURATION ---
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const X_CLIENT_ID = process.env.TWITTER_CLIENT_ID;
const X_CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// --- ROUTE: Generate a User's Roadmap ---
router.get('/generate-roadmap', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(400).json({ msg: 'User not found.' });
    }

    let promptData = {
        youtube: null,
        x: null,
    };

    // 1. Fetch YouTube Data if connected
    if (user.google && user.google.accessToken) {
        const oAuth2Client = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
        oAuth2Client.setCredentials({ access_token: user.google.accessToken });
        const youtube = google.youtube({ version: 'v3', auth: oAuth2Client });
        const channelInfo = await youtube.channels.list({ part: 'snippet,statistics', mine: true });
        promptData.youtube = channelInfo.data.items[0];
    }

    // 2. Fetch X Data if connected
    if (user.x && user.x.accessToken) {
        const xClient = new TwitterApi(user.x.accessToken);
        const xUser = await xClient.v2.me({ 'user.fields': ['public_metrics', 'description'] });
        promptData.x = xUser.data;
    }

    // 3. Construct a powerful prompt for the Gemini API
    const prompt = `
      You are an expert business strategist for online creators. Analyze the following data from the user's connected platforms and generate a concise, actionable growth roadmap.

      **YouTube Data:**
      ${promptData.youtube ? `
      - Channel Name: ${promptData.youtube.snippet.title}
      - Channel Description: "${promptData.youtube.snippet.description}"
      - Subscribers: ${promptData.youtube.statistics.subscriberCount}
      - Total Videos: ${promptData.youtube.statistics.videoCount}
      - Total Views: ${promptData.youtube.statistics.viewCount}
      ` : '- Not Connected'}

      **X Data:**
      ${promptData.x ? `
      - Handle: @${promptData.x.username}
      - Bio: "${promptData.x.description}"
      - Followers: ${promptData.x.public_metrics.followers_count}
      - Following: ${promptData.x.public_metrics.following_count}
      - Tweet Count: ${promptData.x.public_metrics.tweet_count}
      ` : '- Not Connected'}

      **Your Task:**
      Based on all available data, provide a holistic strategic roadmap with three sections:
      1.  **Cross-Platform Content Strategy:** Suggest how the user can leverage their platforms together. What content works on one but not the other? Suggest 2-3 specific ideas.
      2.  **Audience Growth Synergy:** How can they use one platform to grow the other? Provide 2 unique strategies.
      3.  **Unified Monetization Opportunities:** Based on their combined audience and content themes, identify the top 2 most viable digital product or service ideas.

      Format your response clearly with markdown headings for each section. If a platform is not connected, acknowledge that and tailor the advice to the available data.
    `;

    // 4. Call the Gemini API
    const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`;
    const geminiResponse = await axios.post(geminiApiUrl, {
        contents: [{ parts: [{ text: prompt }] }]
    });
    const roadmapText = geminiResponse.data.candidates[0].content.parts[0].text;

    // 5. Send the final roadmap back to the user
    res.json({
        message: "Roadmap generated successfully!",
        roadmap: roadmapText
    });

  } catch (err) {
    console.error('Error generating roadmap:', err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
