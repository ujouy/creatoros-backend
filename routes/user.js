// creatoros-backend/routes/user.js

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const User = require('../models/User');

// @route   GET api/user/status
// @desc    Get the connection status for the logged-in user
// @access  Private
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    const connectionStatus = {
      youtube: !!user.google?.accessToken,
      x: !!user.x?.accessToken,
      // Add other platforms here as you integrate them
    };

    res.json(connectionStatus);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
 