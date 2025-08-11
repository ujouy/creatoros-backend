// creatoros-backend/server.js

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); // <-- 1. IMPORT CORS

const app = express();
const port = 3000;

// --- MIDDLEWARE ---
app.use(cors()); // <-- 2. USE CORS
// ------------------

const dbURI = 'mongodb://localhost:27017/creatoros';

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
  console.log(`Server is running at http://localhost:${port}`);
});