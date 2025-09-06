const express = require('express');
const router = express.Router();

// import the db pool
const pool = require('../config/database');

/**
 * @swagger
 * /api/documents:
 *   get:
 *     summary: Fetch all documents
 *     responses:
 *       200:
 *         description: List all documents
 *       500:
 *         description: Internal server error
 */
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM documents_page');
        res.json(result.rows);
    } catch (error) {
        console.error('HTTP GET /api/documents error:', error);
        res.status(500).json({ error: 'Failed to fetch all documents' });
    }
});

module.exports = router;