# Implementation guide for LOGIN/AUTH endpoints (Node.js)

These are implementation notes for creating login/auth endpoints for a Node.js service, actualy example come from my other repo "kgf-backend"

## Mental model: guest list, lock, wristband, bouncer

- Guest list (DB): store proof, not the secret. Only keep a one-way password hash.
- Lock (bcrypt): unique salt + cost factor slows brute-force attacks.
- Wristband (JWT): signed token proving identity for a short time.
- Bouncer (middleware): checks the wristband on protected routes.

Remember: “Hash, don’t store” and “The bouncer checks the wristband.”

---

## Environment and dependencies

- Packages: `bcrypt`, `jsonwebtoken`, `express-validator`, `express-rate-limit`, `helmet`, `cors`, `dotenv`, `pg` (or your DB driver).
- Env vars:
  - DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
  - JWT_SECRET (long random), JWT_EXPIRES_IN (e.g., `1h`)
  - BCRYPT_SALT_ROUNDS (e.g., `12`)
  - FRONTEND_ORIGIN (e.g., `http://localhost:3000`)

Lowercase emails consistently to avoid duplicates.

---

## Bcrypt password hashing (why and how)

Why: Salts make hashes unique; cost factor slows guessing. If DB leaks, attackers still don’t have passwords.

```js
// src/utils/password.js
require('dotenv').config();
const bcrypt = require('bcrypt');

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);

async function hashPassword(plainPassword) {
  if (typeof plainPassword !== 'string' || plainPassword.length === 0) {
    throw new Error('Password must be a non-empty string');
  }
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return bcrypt.hash(plainPassword, salt);
}

async function verifyPassword(plainPassword, passwordHash) {
  if (!passwordHash) return false;
  return bcrypt.compare(plainPassword, passwordHash);
}

module.exports = { hashPassword, verifyPassword };
```

Contract:
- hash(plain) => opaque string (store it)
- verify(plain, hash) => boolean (never reveals the password)

---

## JWT signing and middleware (the wristband and bouncer)

Why: Stateless identity with expiry. Signed so the client can’t forge it.

```js
// src/middleware/auth.js
require('dotenv').config();
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change';

function signAccessToken(payload) {
  const expiresIn = process.env.JWT_EXPIRES_IN || '1h';
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(401).json({ error: 'Invalid token' });
    req.user = user; // { id, email, role }
    next();
  });
}

module.exports = { signAccessToken, authenticateToken };
```

Hook: “Tokens expire; short-lived is safer.”

---

## Input validation (fail fast)

```js
// src/middleware/validators.js
const { body, validationResult } = require('express-validator');

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

const registerValidation = [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('name').optional().isLength({ max: 100 }).withMessage('Name too long'),
  handleValidation,
];

const loginValidation = [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isString().notEmpty().withMessage('Password required'),
  handleValidation,
];

module.exports = { registerValidation, loginValidation };
```

---

## Controllers: register, login, me

```js
// src/controllers/authController.js
const pool = require('../config/database');
const { hashPassword, verifyPassword } = require('../utils/password');
const { signAccessToken } = require('../middleware/auth');

async function register(req, res) {
  try {
    const { email, password, name } = req.body;
    const lower = email.toLowerCase();

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [lower]);
    if (existing.rows.length > 0) return res.status(409).json({ error: 'Email already in use' });

    const passwordHash = await hashPassword(password);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, $2, $3)
       RETURNING id, email, name, role, created_at`,
      [lower, passwordHash, name || null]
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
    const lower = email.toLowerCase();
    const result = await pool.query(
      'SELECT id, email, password_hash, name, role FROM users WHERE email = $1',
      [lower]
    );
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

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
    const result = await pool.query(
      'SELECT id, email, name, role, created_at FROM users WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    return res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('GET /api/auth/me error:', err);
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }
}

module.exports = { register, login, me };
```

---

## Routes, rate limit, and app hardening

```js
// src/routes/auth.js
const express = require('express');
const rateLimit = require('express-rate-limit');
const { register, login, me } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { registerValidation, loginValidation } = require('../middleware/validators');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', registerValidation, register);
router.post('/login', loginLimiter, loginValidation, login);
router.get('/me', authenticateToken, me);

module.exports = router;
```

App bootstrap essentials:
- `app.use(helmet())`
- `app.use(cors({ origin: FRONTEND_ORIGIN, credentials: true }))`
- Mount routes: `app.use('/api/auth', require('./routes/auth'))`

---

## Database schema (manual creation)

```sql
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Keep updated_at current
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_users') THEN
    CREATE TRIGGER set_timestamp_users
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE PROCEDURE trigger_set_timestamp();
  END IF;
END $$;
```

Tip: store emails in lowercase.

---

## Swagger: authorize with your JWT

1) POST `/api/auth/login` → copy `token`.
2) In Swagger UI → Authorize → select `bearerAuth` → paste token only (no `Bearer `).
3) Call protected routes like `GET /api/auth/me`.

If you still get 401: ensure JWT_SECRET matches and token isn’t expired.

---

## Security checklist and memory hooks

Checklist:
- Never log or return passwords/hashes.
- Uniform login errors (“Invalid credentials”).
- Rate-limit login; consider lockout/backoff.
- Use HTTPS; rotate JWT secrets; keep tokens short-lived.

Hooks:
- Hash, don’t store.
- Salt every password.
- The bouncer checks the wristband.
- Tokens expire; short-lived is safer.