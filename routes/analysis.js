const express = require('express');
const axios = require('axios');
const auth = require('../middleware/auth');

const router = express.Router();

// Generate AI-powered roadmap analysis
router.get('/generate-roadmap', auth, async (req, res) => {
  try {
    const user = req.user;
    let analysisData = {
      user: {
        email: user.email,
        subscriptionPlan: user.subscriptionPlan,
        connectedPlatforms: []
      },
      platforms: {}
    };

    // Fetch Google/YouTube data if connected
    if (user.isGoogleConnected()) {
      try {
        // Get YouTube channel data
        const channelResponse = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
          params: {
            part: 'snippet,statistics',
            mine: true
          },
          headers: {
            'Authorization': `Bearer ${user.google.accessToken}`
          }
        });

        if (channelResponse.data.items && channelResponse.data.items.length > 0) {
          const channel = channelResponse.data.items[0];
          analysisData.platforms.youtube = {
            channelName: channel.snippet.title,
            description: channel.snippet.description,
            subscriberCount: parseInt(channel.statistics.subscriberCount) || 0,
            videoCount: parseInt(channel.statistics.videoCount) || 0,
            viewCount: parseInt(channel.statistics.viewCount) || 0,
            customUrl: channel.snippet.customUrl,
            publishedAt: channel.snippet.publishedAt
          };
          analysisData.user.connectedPlatforms.push('YouTube');
        }
      } catch (error) {
        console.error('YouTube API error:', error.response?.data || error.message);
        analysisData.platforms.youtube = { error: 'Failed to fetch YouTube data' };
      }
    }

    // Fetch X (Twitter) data if connected
    if (user.isXConnected()) {
      try {
        // Get user's profile with metrics
        const profileResponse = await axios.get('https://api.twitter.com/2/users/me', {
          params: {
            'user.fields': 'public_metrics,description,created_at,verified'
          },
          headers: {
            'Authorization': `Bearer ${user.x.accessToken}`
          }
        });

        const profile = profileResponse.data.data;
        analysisData.platforms.x = {
          username: profile.username,
          name: profile.name,
          description: profile.description,
          followersCount: profile.public_metrics.followers_count,
          followingCount: profile.public_metrics.following_count,
          tweetCount: profile.public_metrics.tweet_count,
          listedCount: profile.public_metrics.listed_count,
          verified: profile.verified,
          createdAt: profile.created_at
        };
        analysisData.user.connectedPlatforms.push('X (Twitter)');
      } catch (error) {
        console.error('X API error:', error.response?.data || error.message);
        analysisData.platforms.x = { error: 'Failed to fetch X data' };
      }
    }

    // Check if any platforms are connected
    if (analysisData.user.connectedPlatforms.length === 0) {
      return res.status(400).json({
        error: 'No platforms connected',
        message: 'Please connect at least one platform (Google/YouTube or X) to generate analysis.'
      });
    }

    // Construct detailed prompt for Gemini AI
    const prompt = buildAnalysisPrompt(analysisData);

    // Call Gemini API
    const geminiResponse = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    const analysis = geminiResponse.data.candidates[0].content.parts[0].text;

    res.json({
      success: true,
      analysis,
      dataUsed: {
        platforms: Object.keys(analysisData.platforms),
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Analysis generation error:', error);
    
    if (error.response?.status === 401) {
      return res.status(401).json({
        error: 'API authentication failed',
        message: 'One or more platform tokens have expired. Please reconnect your accounts.'
      });
    }

    res.status(500).json({
      error: 'Server error',
      message: 'Failed to generate analysis. Please try again later.'
    });
  }
});

// Helper function to build comprehensive analysis prompt
function buildAnalysisPrompt(data) {
  let prompt = `As an expert business strategist for content creators, analyze the following data and provide a comprehensive business roadmap and strategy recommendations.\n\n`;
  
  prompt += `CREATOR PROFILE:\n`;
  prompt += `- Email: ${data.user.email}\n`;
  prompt += `- Current Subscription: ${data.user.subscriptionPlan}\n`;
  prompt += `- Connected Platforms: ${data.user.connectedPlatforms.join(', ')}\n\n`;

  if (data.platforms.youtube) {
    prompt += `YOUTUBE CHANNEL DATA:\n`;
    if (data.platforms.youtube.error) {
      prompt += `- Error: ${data.platforms.youtube.error}\n`;
    } else {
      prompt += `- Channel Name: ${data.platforms.youtube.channelName}\n`;
      prompt += `- Subscribers: ${data.platforms.youtube.subscriberCount?.toLocaleString() || 'N/A'}\n`;
      prompt += `- Total Videos: ${data.platforms.youtube.videoCount || 'N/A'}\n`;
      prompt += `- Total Views: ${data.platforms.youtube.viewCount?.toLocaleString() || 'N/A'}\n`;
      prompt += `- Channel Started: ${data.platforms.youtube.publishedAt || 'N/A'}\n`;
      prompt += `- Description: ${data.platforms.youtube.description?.substring(0, 200) || 'N/A'}...\n`;
    }
    prompt += '\n';
  }

  if (data.platforms.x) {
    prompt += `X (TWITTER) PROFILE DATA:\n`;
    if (data.platforms.x.error) {
      prompt += `- Error: ${data.platforms.x.error}\n`;
    } else {
      prompt += `- Username: @${data.platforms.x.username}\n`;
      prompt += `- Display Name: ${data.platforms.x.name}\n`;
      prompt += `- Followers: ${data.platforms.x.followersCount?.toLocaleString() || 'N/A'}\n`;
      prompt += `- Following: ${data.platforms.x.followingCount?.toLocaleString() || 'N/A'}\n`;
      prompt += `- Total Tweets: ${data.platforms.x.tweetCount?.toLocaleString() || 'N/A'}\n`;
      prompt += `- Account Created: ${data.platforms.x.createdAt || 'N/A'}\n`;
      prompt += `- Verified: ${data.platforms.x.verified ? 'Yes' : 'No'}\n`;
      prompt += `- Bio: ${data.platforms.x.description || 'N/A'}\n`;
    }
    prompt += '\n';
  }

  prompt += `ANALYSIS REQUIREMENTS:\n`;
  prompt += `Please provide a detailed business strategy analysis covering:\n\n`;
  prompt += `1. CURRENT STATUS ASSESSMENT\n`;
  prompt += `   - Analyze the creator's current position across platforms\n`;
  prompt += `   - Identify strengths and growth opportunities\n`;
  prompt += `   - Calculate engagement rates and performance metrics\n\n`;
  
  prompt += `2. CONTENT STRATEGY RECOMMENDATIONS\n`;
  prompt += `   - Suggest content themes and topics based on current performance\n`;
  prompt += `   - Recommend optimal posting frequency and timing\n`;
  prompt += `   - Cross-platform content synergy strategies\n\n`;
  
  prompt += `3. AUDIENCE GROWTH TACTICS\n`;
  prompt += `   - Specific strategies to increase followers/subscribers\n`;
  prompt += `   - Community building recommendations\n`;
  prompt += `   - Collaboration opportunities\n\n`;
  
  prompt += `4. MONETIZATION ROADMAP\n`;
  prompt += `   - Revenue stream opportunities based on current metrics\n`;
  prompt += `   - Pricing strategies for products/services\n`;
  prompt += `   - Sponsorship and partnership potential\n\n`;
  
  prompt += `5. 90-DAY ACTION PLAN\n`;
  prompt += `   - Week-by-week actionable steps\n`;
  prompt += `   - Key performance indicators to track\n`;
  prompt += `   - Milestone goals and success metrics\n\n`;
  
  prompt += `Please make the analysis practical, data-driven, and tailored specifically to this creator's current situation and metrics.`;

  return prompt;
}

module.exports = router;