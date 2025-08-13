// creatoros-backend/server.js

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const dbURI = process.env.DATABASE_URL;

if (!dbURI) {
  console.error('Error: DATABASE_URL environment variable not set.');
  process.exit(1);
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
// --- ADD THIS LINE ---
app.use('/api/user', require('./routes/user'));
// ---------------------
