// creatoros-backend/middleware/auth.js

const jwt = require('jsonwebtoken');

const JWT_SECRET = 'your_super_secret_string_12345';

module.exports = function(req, res, next) {
  // --- MODIFIED SECTION ---
  // Try to get token from the header first
  let token = req.header('x-auth-token');

  // If no token in header, check the query parameters as a fallback
  if (!token && req.query.token) {
    token = req.query.token;
  }
  // ------------------------

  // Check if no token found in either place
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  // Verify token
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};