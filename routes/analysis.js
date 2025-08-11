// routes/analysis.js

const express = require('express');
const router = express.Router();
const axios = require('axios'); // Import axios
const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
const authMiddleware = require('../middleware/auth');
const User = require('../models/User');

// --- CONFIGURATION ---
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// --- ROUTE: Generate a User's Roadmap ---
router.get('/generate-roadmap', authMiddleware, async (req, res) => {
  try {
    // 1. Get user and set up Google API client (same as before)
    const user = await User.findById(req.user.id);
    if (!user || !user.google || !user.google.accessToken) {
      return res.status(400).json({ msg: 'User not found or Google account not connected.' });
    }

    const oAuth2Client = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
    oAuth2Client.setCredentials({
      access_token: user.google.accessToken,
      refresh_token: user.google.refreshToken,
      expiry_date: user.google.expiryDate
    });

    const youtube = google.youtube({ version: 'v3', auth: oAuth2Client });

    // 2. Fetch data from the YouTube API (same as before)
    const channelInfo = await youtube.channels.list({
      part: 'snippet,statistics',
      mine: true
    });

    const channelData = channelInfo.data.items[0];
    const { title, description } = channelData.snippet;
    const { subscriberCount, videoCount, viewCount } = channelData.statistics;

    // 3. Construct a powerful prompt for the Gemini API
    const prompt = `
      You are an expert business strategist for YouTube creators. Analyze the following channel data and generate a concise, actionable growth roadmap.

      **Channel Data:**
      - Channel Name: ${title}
      - Channel Description: "${description}"
      - Subscribers: ${subscriberCount}
      - Total Videos: ${videoCount}
      - Total Views: ${viewCount}

      **Your Task:**
      Based on the data, provide a strategic roadmap with three sections:
      1.  **Content Strategy:** Suggest 2-3 specific video ideas or series formats that would likely perform well for this channel's niche.
      2.  **Monetization Opportunities:** Identify the top 2 most viable digital product or service ideas for this creator to pursue.
      3.  **Audience Growth Levers:** Recommend 2 unique strategies to accelerate subscriber growth.

      Format your response clearly with markdown headings for each section.
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
    // More detailed error logging
    if (err.response) {
        console.error('Error from API:', err.response.data);
    } else {
        console.error('Error generating roadmap:', err.message);
    }
    res.status(500).send('Server Error');
  }
});

module.exports = router;