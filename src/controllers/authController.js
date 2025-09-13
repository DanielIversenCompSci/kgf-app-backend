const pool = require('../config/database');
const { hashPassword, verifyPassword } = require('../utils/password');
const { signAccessToken } = require('../middleware/auth');

async function register(req, res) {
  try {
    const { email, password, name } = req.body;

    // Check if user exists
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    const passwordHash = await hashPassword(password);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, $2, $3)
       RETURNING id, email, name, role, created_at`,
      [email.toLowerCase(), passwordHash, name || null]
    );
    const user = result.rows[0];

    const token = signAccessToken({ id: user.id, email: user.email, role: user.role });
    return res.status(201).json({ user, token });
  } catch (err) {
    console.error('POST /api/auth/register error:', err);
    return res.status(500).json({ error: 'Failed to register user' });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    const result = await pool.query(
      'SELECT id, email, password_hash, name, role FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = result.rows[0];

    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    delete user.password_hash;
    const token = signAccessToken({ id: user.id, email: user.email, role: user.role });
    return res.json({ user, token });
  } catch (err) {
    console.error('POST /api/auth/login error:', err);
    return res.status(500).json({ error: 'Failed to login' });
  }
}

async function me(req, res) {
  try {
    const { id } = req.user;
    const result = await pool.query('SELECT id, email, name, role, created_at FROM users WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    return res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('GET /api/auth/me error:', err);
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }
}

module.exports = { register, login, me };
