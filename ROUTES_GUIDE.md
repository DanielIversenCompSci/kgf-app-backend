# 📚 KGF Backend API - Route & Endpoint Guide

## 🎯 **Quick Reference: Adding New Routes**

Follow this pattern every time you want to add new functionality to your API.

---

## 🏗️ **The 4-Step Route Addition Process**

### **Step 1: Plan Your Resource** 🧠
*"What are you managing?"*

**Ask yourself:**
- What **thing** am I managing? (users, products, orders, etc.)
- What **operations** do I need? (CRUD: Create, Read, Update, Delete)
- What **data** will I store/retrieve?

**Example:** Managing "users" → Need to create, list, get one, update, delete

---

### **Step 2: Create the Router File** 📁
*"Build your route container"*

**Create:** `src/routes/[resource-name].js`

```javascript
// filepath: src/routes/users.js
const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Routes go here...

module.exports = router;
```

**Why this structure?**
- **Separation**: Each resource gets its own file
- **Organization**: Easy to find and maintain
- **Scalability**: Add new resources without touching existing code

---

### **Step 3: Add Routes Using HTTP Methods** 🛠️

#### **GET Routes (Read Data)**

```javascript
// GET ALL - List all items
// URL: GET /api/users
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users ORDER BY id');
    res.json(result.rows);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET ONE - Get specific item by ID
// URL: GET /api/users/123
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});
```

#### **POST Routes (Create Data)**

```javascript
// CREATE - Add new item
// URL: POST /api/users
router.post('/', async (req, res) => {
  try {
    const { name, email, age } = req.body;
    
    // Validation (optional but recommended)
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }
    
    const result = await pool.query(
      'INSERT INTO users (name, email, age) VALUES ($1, $2, $3) RETURNING *',
      [name, email, age]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});
```

#### **PUT Routes (Update Data)**

```javascript
// UPDATE - Modify existing item
// URL: PUT /api/users/123
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, age } = req.body;
    
    const result = await pool.query(
      'UPDATE users SET name = $1, email = $2, age = $3 WHERE id = $4 RETURNING *',
      [name, email, age, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});
```

#### **DELETE Routes (Remove Data)**

```javascript
// DELETE - Remove item
// URL: DELETE /api/users/123
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'User deleted successfully', user: result.rows[0] });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});
```

---

### **Step 4: Register the Router in App.js** 🔗
*"Tell your app about the new routes"*

**Add this line to `src/app.js`:**

```javascript
// filepath: src/app.js
// ...existing code...

// Register your new router
app.use('/api/users', require('./routes/users'));

// ...existing code...
```

**Why this pattern?**
- **Mounting**: All `/api/users/*` requests go to your users router
- **Prefix**: Clean URLs like `/api/users` instead of `/users`
- **Organization**: Easy to see all your API endpoints

---

## 🎨 **Advanced Route Patterns**

### **Query Parameters (Filtering/Pagination)**

```javascript
// GET /api/users?limit=10&offset=20&search=john
router.get('/', async (req, res) => {
  try {
    const { limit = 50, offset = 0, search } = req.query;
    
    let query = 'SELECT * FROM users';
    let params = [];
    
    if (search) {
      query += ' WHERE name ILIKE $1';
      params.push(`%${search}%`);
    }
    
    query += ` ORDER BY id LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});
```

### **Nested Routes (Relationships)**

```javascript
// GET /api/users/123/posts - Get all posts by a specific user
router.get('/:userId/posts', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM posts WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch user posts' });
  }
});
```

### **Custom Actions (Non-CRUD)**

```javascript
// POST /api/users/123/activate - Custom action
router.post('/:id/activate', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'UPDATE users SET status = $1, activated_at = NOW() WHERE id = $2 RETURNING *',
      ['active', id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'User activated successfully', user: result.rows[0] });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to activate user' });
  }
});
```

---

## 🛡️ **Best Practices Checklist**

### **✅ Always Include:**
- **Error handling** with try/catch
- **Status codes** (200, 201, 400, 404, 500)
- **Input validation** for required fields
- **Parameterized queries** to prevent SQL injection

### **✅ HTTP Status Code Guide:**
- **200**: OK (successful GET, PUT)
- **201**: Created (successful POST)
- **400**: Bad Request (missing/invalid data)
- **404**: Not Found (resource doesn't exist)
- **500**: Internal Server Error (unexpected error)

### **✅ URL Naming Conventions:**
- Use **plural nouns**: `/api/users` not `/api/user`
- Use **kebab-case**: `/api/user-profiles` not `/api/userProfiles`
- Be **consistent**: All routes follow same pattern

### **✅ Security Tips:**
- Always use **parameterized queries** ($1, $2, $3...)
- **Validate input** before database operations
- **Sanitize data** especially for search queries
- **Limit query results** to prevent huge responses

---

## 🚀 **Quick Start Template**

**Copy this template for any new resource:**

```javascript
// filepath: src/routes/[resource].js
const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// GET ALL
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM [table_name] ORDER BY id');
    res.json(result.rows);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch [resource]' });
  }
});

// GET ONE
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM [table_name] WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '[Resource] not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch [resource]' });
  }
});

// CREATE
router.post('/', async (req, res) => {
  try {
    const { field1, field2 } = req.body;
    
    if (!field1) {
      return res.status(400).json({ error: 'Field1 is required' });
    }
    
    const result = await pool.query(
      'INSERT INTO [table_name] (field1, field2) VALUES ($1, $2) RETURNING *',
      [field1, field2]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to create [resource]' });
  }
});

// UPDATE
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { field1, field2 } = req.body;
    
    const result = await pool.query(
      'UPDATE [table_name] SET field1 = $1, field2 = $2 WHERE id = $3 RETURNING *',
      [field1, field2, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '[Resource] not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to update [resource]' });
  }
});

// DELETE
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM [table_name] WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '[Resource] not found' });
    }
    
    res.json({ message: '[Resource] deleted successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to delete [resource]' });
  }
});

module.exports = router;
```

**Remember to:**
1. Replace `[resource]`, `[table_name]`, and field names
2. Add the router to `app.js`
3. Test each endpoint!

---

## 🧠 **Memory Tricks**

- **CRUD** = **C**reate **R**ead **U**pdate **D**elete
- **GET** = **G**et **e**xisting **t**hings (Read)
- **POST** = **P**ut **o**ne **s**omething **t**here (Create)
- **PUT** = **P**lace **u**pdated **t**hing (Update)
- **DELETE** = **D**estroy **e**verything **l**ike **e**liminate **t**otally **e**nd (Delete)

**Happy coding! 🚀**
