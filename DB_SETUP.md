# Database setup for authentication (PostgreSQL)

This guide helps you create the `users` table used by the new auth endpoints. No plaintext passwords are stored; passwords are salted and hashed with bcrypt.

## Prerequisites

- PostgreSQL running and accessible
- Your DB connection details ready (host, port, database, user, password)
- Environment file `.env` configured at project root with at least:
  - DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
  - JWT_SECRET (any strong random string)
  - BCRYPT_SALT_ROUNDS (e.g., 12)

## Create the table manually (copy/paste SQL)

```sql
-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Trigger to keep updated_at current on updates
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_users'
  ) THEN
    CREATE TRIGGER set_timestamp_users
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE PROCEDURE trigger_set_timestamp();
  END IF;
END $$;
```

## Verify

From psql:

```sql
\d+ users;   -- shows table definition
SELECT * FROM users LIMIT 1;  -- should return zero rows initially
```

## Optional: Create a test user

1) Generate a bcrypt hash (example using Node.js locally):

```bash
node -e "require('bcrypt').hash(process.argv[1], 12).then(h=>console.log(h))" 'YourStrongP@ssw0rd'
```

Copy the printed hash.

2) Insert the user (store emails in lowercase):

```sql
INSERT INTO users (email, password_hash, name, role)
VALUES ('test@example.com', '<PASTE_BCRYPT_HASH_HERE>', 'Test User', 'user');
```

3) Test login via the API after starting the server.

## Notes

- The API lowercases emails on registration and login; keep stored emails lowercase to match.
- Do not store or log plaintext passwords anywhere.
- You can later move this into a migration system if desired.
