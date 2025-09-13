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
    const { email } = req.body || {};
    // No validation/auth by design; store given email and current date
    await pool.query(
      'INSERT INTO newsletter_store (email, created_at) VALUES ($1, CURRENT_DATE)',
      [email || null]
    );
    res.status(201).json({ message: 'Subscribed' });
  } catch (error) {
    console.error('HTTP POST /api/newsletter error:', error);
    res.status(500).json({ error: 'Failed to store email' });
  }
});

module.exports = router;
