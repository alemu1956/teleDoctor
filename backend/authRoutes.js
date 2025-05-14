// authRoutes.js
const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const bcrypt = require('bcrypt');
const router = express.Router();
require('dotenv').config();

const usersFile = './users.json';

// Load and save users
function loadUsers() {
  try {
    return JSON.parse(fs.readFileSync(usersFile));
  } catch {
    return [];
  }
}
function saveUsers(users) {
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
}
function logAction(by, action, user) {
  const log = {
    timestamp: new Date().toISOString(),
    by,
    action,
    user: { id: user.id, email: user.email, role: user.role }
  };
  const logs = fs.existsSync('logs.json') ? JSON.parse(fs.readFileSync('logs.json')) : [];
  logs.push(log);
  fs.writeFileSync('logs.json', JSON.stringify(logs, null, 2));
}
function verifyAdmin(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(403).json({ error: 'Missing token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') return res.status(403).json({ error: 'Admins only' });
    req.admin = decoded;
    next();
  } catch {
    return res.status(403).json({ error: 'Invalid token' });
  }
}

// Register route
router.post('/register', async (req, res) => {
  const users = loadUsers();
  const { name, email, password, role } = req.body;

  if (users.find(u => u.email === email)) {
    return res.status(400).json({ error: 'Email already exists' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = {
    id: Date.now(),
    name,
    email,
    password: hashedPassword,
    role,
    approved: false
  };

  users.push(newUser);
  saveUsers(users);
  res.json({ message: 'Registered successfully. Awaiting approval.' });
});

// Login route
router.post('/login', async (req, res) => {
  const users = loadUsers();
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  if (!user.approved) {
    return res.status(403).json({ error: 'User not yet approved' });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
  res.json({ token, role: user.role });
});

// Admin: View pending users
router.get('/pending', verifyAdmin, (req, res) => {
  const users = loadUsers();
  const pending = users.filter(u => !u.approved);
  res.json(pending);
});

// Admin: Approve user
router.post('/approve/:id', verifyAdmin, (req, res) => {
  const users = loadUsers();
  const user = users.find(u => u.id == req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  user.approved = true;
  saveUsers(users);
  logAction(req.admin.email, 'approved', user);
  res.json({ message: 'User approved.' });
});

// Admin: Reject user
router.post('/reject/:id', verifyAdmin, (req, res) => {
  let users = loadUsers();
  const user = users.find(u => u.id == req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  logAction(req.admin.email, 'rejected', user);
  users = users.filter(u => u.id != req.params.id);
  saveUsers(users);
  res.json({ message: 'User rejected and removed.' });
});

module.exports = router;