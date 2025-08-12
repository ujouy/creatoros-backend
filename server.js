// creatoros-backend/server.js

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
// Use the PORT environment variable from Render, or 3000 for local development
const port = process.env.PORT || 3000;

// --- MIDDLEWARE ---
app.use(cors());
// This is needed to parse JSON bodies in POST requests
app.use(express.json());
// ------------------

// Use the DATABASE_URL environment variable from Render
const dbURI = process.env.DATABASE_URL;

// Add a check to ensure the DATABASE_URL is provided
if (!dbURI) {
  console.error('Error: DATABASE_URL environment variable not set.');
  process.exit(1); // Exit the process with an error code
}

mongoose.connect(dbURI)
  .then(() => console.log('Successfully connected to MongoDB!'))
  .catch(err => console.error('Could not connect to MongoDB:', err));

app.get('/', (req, res) => {
  res.send('Hello, CreatorOS Navigator Backend!');
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/integrations', require('./routes/integrations'));
app.use('/api/analysis', require('./routes/analysis'));

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
