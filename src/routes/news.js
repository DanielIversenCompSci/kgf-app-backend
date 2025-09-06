const express = require('express');
const router = express.Router();

// import the db pool
const pool = require('../config/database');

/**
 * @swagger
 * /api/news:
 *   get:
 *     summary: Fetch all news
 *     responses:
 *       200:
 *         description: List all news
 *       500:
 *         description: Internal server error
 */
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM news_page');
        res.json(result.rows);
    } catch (error) {
        console.error('HTTP GET /api/news error:', error);
        res.status(500).json({ error: 'Failed to fetch all news' });
    }
});

module.exports = router;