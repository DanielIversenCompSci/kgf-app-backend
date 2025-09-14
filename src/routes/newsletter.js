const express = require('express');
const router = express.Router();

// import the db pool
const pool = require('../config/database');

/**
 * @swagger
 * /api/newsletter:
 *   post:
 *     summary: Subscribe an email to the newsletter
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *     responses:
 *       201:
 *         description: Email stored
 *       500:
 *         description: Internal server error
 */
router.post('/', async (req, res) => {
  try {
    const raw = (req.body && req.body.email) || '';
    const email = raw.trim();
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const result = await pool.query(
      'INSERT INTO newsletter_store (email, created_at) VALUES ($1, CURRENT_DATE) ON CONFLICT (email) DO NOTHING RETURNING email',
      [email]
    );

    if (result.rowCount === 0) {
      return res.status(200).json({ message: 'Already subscribed' });
    }
    res.status(201).json({ message: 'Subscribed' });
  } catch (error) {
    console.error('HTTP POST /api/newsletter error:', error);
    res.status(500).json({ error: 'Failed to store email' });
  }
});

module.exports = router;
