const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "teleDoctorSecret";
const USERS_FILE = path.join(__dirname, "users.json");
const LOGS_FILE = path.join(__dirname, "logs.json");

// ✅ Utility: Load and save users
function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) return [];
  return JSON.parse(fs.readFileSync(USERS_FILE));
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// ✅ Utility: Log admin actions
function logAction(adminEmail, action, user) {
  const log = {
    timestamp: new Date().toISOString(),
    admin: adminEmail,
    action,
    targetUser: user.email
  };
  const logs = fs.existsSync(LOGS_FILE) ? JSON.parse(fs.readFileSync(LOGS_FILE)) : [];
  logs.push(log);
  fs.writeFileSync(LOGS_FILE, JSON.stringify(logs, null, 2));
}

// 📝 Register
router.post("/register", (req, res) => {
  const { name, email, password, role } = req.body;
  const users = loadUsers();
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ error: "User already exists." });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
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
  res.json({ message: "Registration successful. Awaiting admin approval." });
});

// 🔑 Login
router.post("/login", (req, res) => {
  const { email, password } = req.body;
  console.log("LOGIN REQUEST RECEIVED");
  console.log("BODY:", req.body);

  const users = loadUsers();
  const user = users.find(u => u.email === email);

  if (!user) return res.status(401).json({ error: "Invalid email or password." });
  if (!bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: "Invalid email or password." });
  }
  if (!user.approved) return res.status(403).json({ error: "Account pending approval." });

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, {
    expiresIn: "1d"
  });

  res.json({ token, role: user.role });
});

// 🟡 Get pending users (Admin only)
router.get("/pending", (req, res) => {
  const users = loadUsers();
  const pending = users.filter(u => !u.approved);
  res.json(pending);
});

// ✅ Approve user (Admin)
router.post("/approve/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(403).json({ error: "No token provided" });

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return res.status(403).json({ error: "Invalid token" });
  }

  const users = loadUsers();
  const user = users.find(u => u.id === id);
  if (!user) return res.status(404).json({ error: "User not found" });

  user.approved = true;
  saveUsers(users);
  logAction(decoded.email, "approved", user);
  res.json({ message: "User approved." });
});

// ❌ Reject user (Admin)
router.post("/reject/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(403).json({ error: "No token provided" });

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return res.status(403).json({ error: "Invalid token" });
  }

  let users = loadUsers();
  const user = users.find(u => u.id === id);
  if (!user) return res.status(404).json({ error: "User not found" });

  users = users.filter(u => u.id !== id);
  saveUsers(users);
  logAction(decoded.email, "rejected", user);
  res.json({ message: "User rejected and removed." });
});

// 📜 Logs viewer (Admin)
router.get("/logs", (req, res) => {
  if (!fs.existsSync(LOGS_FILE)) return res.json([]);
  const logs = JSON.parse(fs.readFileSync(LOGS_FILE));
  res.json(logs);
});

module.exports = router;