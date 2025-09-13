# Frontend Auth Setup Guide

End-to-end instructions for wiring a frontend to this backend’s auth.

Works with any frontend; includes a minimal vanilla JS example and a React example.

---

## 1) Prerequisites

- Backend running on `http://localhost:3001` (or your configured `PORT`).
- Backend CORS allows your frontend origin (`FRONTEND_ORIGIN` in `.env`).
- Auth endpoints available:
  - POST `/api/auth/login` → `{ user, token }`
  - POST `/api/auth/register` → `{ user, token }` (optional; you may onboard admins manually)
  - GET `/api/auth/me` → `{ user }` (requires `Authorization: Bearer <token>`)

Validate backend quickly:

```bash
# Replace email/password with a real user
curl -s -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"YourStrongP@ssw0rd"}'
```

You should get a JSON with `token`. Use it:

```bash
curl -s http://localhost:3001/api/auth/me \
  -H 'Authorization: Bearer <paste-token-here>'
```

---

## 2) Auth contract for the frontend

- On login success, you receive `{ user, token }`.
- Send the token on each protected request:
  - Header: `Authorization: Bearer <token>`
- If any protected request returns `401`, treat the user as logged out.

Token storage options:
- In-memory (safest vs XSS; lost on refresh unless you re-login or add refresh tokens).
- localStorage/sessionStorage (simple, but vulnerable to XSS—use only if you trust your app’s XSS posture).
- HttpOnly cookies (requires backend changes: set cookies + CSRF protection; not implemented here yet).

---

## 3) Minimal vanilla JS example

```html
<!doctype html>
<html>
  <body>
    <form id="login-form">
      <input id="email" placeholder="Email" />
      <input id="password" type="password" placeholder="Password" />
      <button>Login</button>
    </form>

    <pre id="output"></pre>

    <script>
      const API_BASE = 'http://localhost:3001';
      let token = null; // consider in-memory only

      const out = (msg) => document.getElementById('output').textContent = msg;

      document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const res = await fetch(`${API_BASE}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        if (!res.ok) { out('Login failed'); return; }
        const data = await res.json();
        token = data.token; // store safely; localStorage is optional
        out('Logged in as: ' + JSON.stringify(data.user, null, 2));
      });

      async function getMe() {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.status === 401) { out('Unauthorized; please login'); return; }
        out('Me: ' + JSON.stringify(await res.json(), null, 2));
      }

      // Example usage after login:
      // getMe();
    </script>
  </body>
</html>
```

---

## 4) React quickstart (recommended)

Directory suggestions:
- `src/api.ts` or `src/api.js` → API helpers
- `src/AuthContext.tsx` or `.jsx` → auth state (token, user)
- `src/ProtectedRoute.tsx` → wrapper for protected routes
- `src/Login.tsx` → login page

### 4.1 API helpers (fetch)

```js
// src/api.js
const API_BASE = 'http://localhost:3001';

export async function login(email, password) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) throw new Error('Login failed');
  return res.json(); // { user, token }
}

export async function getMe(token) {
  const res = await fetch(`${API_BASE}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Unauthorized');
  return res.json(); // { user }
}
```

### 4.2 Auth context

```jsx
// src/AuthContext.jsx
import React, { createContext, useEffect, useMemo, useState } from 'react';
import { login as apiLogin, getMe } from './api';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!token);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const { user } = await getMe(token);
        setUser(user);
      } catch {
        setToken(null);
        localStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const value = useMemo(() => ({
    token,
    user,
    loading,
    login: async (email, password) => {
      const { user, token } = await apiLogin(email, password);
      setUser(user);
      setToken(token);
      localStorage.setItem('token', token); // or keep only in memory
    },
    logout: () => {
      setUser(null);
      setToken(null);
      localStorage.removeItem('token');
    }
  }), [token, user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
```

### 4.3 ProtectedRoute

```jsx
// src/ProtectedRoute.jsx
import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from './AuthContext';

export default function ProtectedRoute({ children }) {
  const { token, loading } = useContext(AuthContext);
  if (loading) return null; // or spinner
  return token ? children : <Navigate to="/login" replace />;
}
```

### 4.4 Login page

```jsx
// src/Login.jsx
import React, { useContext, useState } from 'react';
import { AuthContext } from './AuthContext';

export default function Login() {
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      window.location.href = '/admin';
    } catch {
      setErr('Invalid email or password');
    }
  };

  return (
    <form onSubmit={onSubmit}>
      {err && <div>{err}</div>}
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
      <button type="submit">Login</button>
    </form>
  );
}
```

### 4.5 App wiring (react-router example)

```jsx
// src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import ProtectedRoute from './ProtectedRoute';
import Login from './Login';
import Admin from './Admin';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={
            <ProtectedRoute>
              <Admin />
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
```

---

## 5) Handling errors and 401s

- If a request returns `401`, clear your stored token and navigate to `/login`.
- Show user-friendly errors on login (avoid leaking which field was wrong).
- Consider a global API wrapper or axios interceptor to catch `401` centrally.

Axios interceptor sketch:
```js
import axios from 'axios';
const api = axios.create({ baseURL: 'http://localhost:3001' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
```

---

## 6) Security notes

- Prefer in-memory token storage; use localStorage only if you understand XSS risks.
- Always use HTTPS in production to protect the Authorization header.
- Keep backend tokens short-lived via `JWT_EXPIRES_IN` and rotate secrets if compromised.
- If you later move to HttpOnly cookies + refresh tokens, also add CSRF protection.

---

## 7) Configuration checklist

- Backend `.env`:
  - `FRONTEND_ORIGIN=http://localhost:3000` (or your dev URL)
  - `JWT_SECRET`, `JWT_EXPIRES_IN`, `BCRYPT_SALT_ROUNDS` set
- Frontend dev server proxy or full base URL pointing to `http://localhost:3001`
- Swagger UI: use Authorize button with your token for quick testing

---

## 8) Try it (sequence)

1) Create a user (via DB insert or `/api/auth/register`).
2) Login from frontend → store token → navigate to admin/dashboard.
3) On app reload, read token → call `/api/auth/me` → hydrate user.
4) Call protected endpoints with `Authorization: Bearer <token>`.
5) On 401, clear token and redirect to `/login`.

With this setup, your frontend remains clean and stateless, and the backend owns security-critical logic (hashing and signing).

---

## 9) Next.js integration (App Router or Pages Router)

You can implement auth in Next.js either on the client or with server-side helpers. Below are simple patterns that align with your backend.

### 9.1 Client-side auth (works in both App and Pages routers)

Key ideas:
- On login, store the token (in memory or localStorage).
- Use a client component/hook to check if a token exists and fetch `/api/auth/me`.
- Protect a page by redirecting to `/login` when there’s no valid token.

Example client hook `useAuth`:

```tsx
// app/hooks/useAuth.ts (or src/hooks/useAuth.ts)
"use client";
import { useEffect, useState } from 'react';

export function useAuth() {
  const [token, setToken] = useState<string | null>(
    () => (typeof window !== 'undefined' ? localStorage.getItem('token') : null)
  );
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(!!token);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch('http://localhost:3001/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        if (!res.ok) throw new Error('Unauthorized');
        const data = await res.json();
        setUser(data.user);
      } catch {
        localStorage.removeItem('token');
        setToken(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const login = async (email: string, password: string) => {
    const res = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error('Login failed');
    const { user, token } = await res.json();
    setUser(user);
    setToken(token);
    localStorage.setItem('token', token);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
  };

  return { token, user, loading, login, logout };
}
```

Protected page (App Router):

```tsx
// app/admin/page.tsx
"use client";
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function AdminPage() {
  const router = useRouter();
  const { token, user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !token) {
      router.replace('/login');
    }
  }, [loading, token, router]);

  if (loading) return null; // or a spinner
  if (!token) return null; // redirected

  return (
    <main>
      <h1>Admin</h1>
      <pre>{JSON.stringify(user, null, 2)}</pre>
    </main>
  );
}
```

Login page (App Router):

```tsx
// app/login/page.tsx
"use client";
import { useAuth } from '../hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await login(email, password);
      router.replace('/admin');
    } catch {
      setErr('Invalid email or password');
    }
  }

  return (
    <form onSubmit={onSubmit}>
      {err && <div>{err}</div>}
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
      <button type="submit">Login</button>
    </form>
  );
}
```

### 9.2 Server-side guard (Pages Router with getServerSideProps)

If you must block render until you know the auth status, you can forward the token (e.g., from cookies) to the backend during SSR. Since this project uses bearer tokens in JS storage by default, this pattern is optional. If you migrate to HttpOnly cookies later, SSR becomes natural:

```ts
// pages/admin.tsx
import type { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const token = ctx.req.cookies['token'] || null; // only if you store it as cookie
  if (!token) {
    return { redirect: { destination: '/login', permanent: false } };
  }
  const res = await fetch('http://localhost:3001/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) {
    return { redirect: { destination: '/login', permanent: false } };
  }
  const data = await res.json();
  return { props: { user: data.user } };
};

export default function Admin({ user }: { user: any }) {
  return <pre>{JSON.stringify(user, null, 2)}</pre>;
}
```

Notes:
- Client-only token storage can’t be read in `getServerSideProps`; for SSR, prefer HttpOnly cookies.
- With client-side auth (as shown), you protect via runtime redirects in client components.

---

That’s it. Next.js works great with your JWT-based backend: client-side guards are simplest today; move to cookies + SSR later if you need stronger controls and better UX.
