const express = require('express');
const auth = require('../middleware/auth');

const router = express.Router();

// Get user connection status
router.get('/status', auth, async (req, res) => {
  try {
    const user = req.user;

    // Check platform connection status
    const status = {
      user: {
        id: user._id,
        email: user.email,
        subscriptionPlan: user.subscriptionPlan,
        joinedAt: user.createdAt
      },
      platforms: {
        youtube: user.isGoogleConnected(),
        x: user.isXConnected()
      },
      connections: {
        google: user.google.connectedAt ? {
          connectedAt: user.google.connectedAt,
          profileName: user.google.profile.name,
          profileEmail: user.google.profile.email
        } : null,
        x: user.x.connectedAt ? {
          connectedAt: user.x.connectedAt,
          profileName: user.x.profile.name,
          profileUsername: user.x.profile.username
        } : null
      }
    };

    res.json({
      success: true,
      status
    });

  } catch (error) {
    console.error('User status error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to retrieve user status.'
    });
  }
});

// Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = req.user;

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        subscriptionPlan: user.subscriptionPlan,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        platformConnections: {
          google: user.isGoogleConnected() ? {
            connected: true,
            profile: user.google.profile,
            connectedAt: user.google.connectedAt
          } : { connected: false },
          x: user.isXConnected() ? {
            connected: true,
            profile: user.x.profile,
            connectedAt: user.x.connectedAt
          } : { connected: false }
        }
      }
    });

  } catch (error) {
    console.error('User profile error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to retrieve user profile.'
    });
  }
});

// Disconnect platform
router.post('/disconnect/:platform', auth, async (req, res) => {
  try {
    const { platform } = req.params;
    const user = req.user;

    let updateQuery = {};

    switch (platform.toLowerCase()) {
      case 'google':
      case 'youtube':
        updateQuery = {
          'google.accessToken': null,
          'google.refreshToken': null,
          'google.profile': {},
          'google.connectedAt': null
        };
        break;
      case 'x':
      case 'twitter':
        updateQuery = {
          'x.accessToken': null,
          'x.refreshToken': null,
          'x.profile': {},
          'x.connectedAt': null
        };
        break;
      default:
        return res.status(400).json({
          error: 'Invalid platform',
          message: 'Platform must be one of: google, youtube, x, twitter'
        });
    }

    const updatedUser = await user.updateOne(updateQuery);

    res.json({
      success: true,
      message: `${platform} account disconnected successfully`,
      platform: platform.toLowerCase()
    });

  } catch (error) {
    console.error('Platform disconnect error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to disconnect platform.'
    });
  }
});

module.exports = router;