const express = require('express');
const dotenv = require('dotenv');
const db = require('./config/db');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON requests
app.use(express.json());

// Sample route to test database connection
app.get('/test-db', async (req, res) => {
  try {
    const client = await db.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    res.status(200).json({ message: 'Database connected', time: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Database connection failed', details: err.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`API Server is running at http://localhost:${PORT}.`);
}); 