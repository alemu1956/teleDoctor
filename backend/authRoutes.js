const express = require("express");
const fs = require("fs");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const router = express.Router();

const USERS_FILE = "users.json";
const LOG_FILE = "logs.json";
const SECRET = "teleDoctorSecretKey";

// Helpers
function loadUsers() {
  return fs.existsSync(USERS_FILE) ? JSON.parse(fs.readFileSync(USERS_FILE, "utf8")) : [];
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function logAction(adminEmail, action, targetUser) {
  const logs = fs.existsSync(LOG_FILE) ? JSON.parse(fs.readFileSync(LOG_FILE, "utf8")) : [];
  logs.push({
    timestamp: new Date().toISOString(),
    admin: adminEmail,
    action,
    target: {
      id: targetUser.id,
      name: targetUser.name,
      email: targetUser.email,
      role: targetUser.role
    }
  });
  fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));
}

// POST /auth/register
router.post("/register", async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: "Missing fields." });
  }

  const users = loadUsers();
  if (users.find(u => u.email === email)) {
    return res.status(409).json({ error: "Email already registered." });
  }

  const hashed = await bcrypt.hash(password, 10);
  const newUser = {
    id: Date.now(),
    name,
    email,
    password: hashed,
    role,
    approved: false
  };

  users.push(newUser);
  saveUsers(users);
  res.status(201).json({ message: "Registration submitted for approval." });
});

// POST /auth/login
router.post("/login", async (req, res) => {
  console.log("LOGIN REQUEST RECEIVED");
  console.log("BODY:", req.body);  // Debug line

  const { email, password } = req.body;
  const users = loadUsers();
  const user = users.find(u => u.email === email);

  if (!user) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  if (!user.approved) {
    return res.status(403).json({ error: "Account not yet approved by Ministry." });
  }

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, SECRET, { expiresIn: "1d" });
  res.json({ token, role: user.role });
});

// GET /auth/verify-token
router.get("/verify-token", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    const decoded = jwt.verify(token, SECRET);
    res.json({ valid: true, user: decoded });
  } catch {
    res.status(403).json({ error: "Invalid token" });
  }
});

// GET /auth/pending-users
router.get("/pending-users", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    const decoded = jwt.verify(token, SECRET);
    if (decoded.role !== "admin") return res.status(403).json({ error: "Access denied" });

    const users = loadUsers();
    const pending = users.filter(u => !u.approved);
    res.json(pending);
  } catch {
    res.status(403).json({ error: "Invalid token" });
  }
});

// POST /auth/approve-user
router.post("/approve-user", (req, res) => {
  const { id } = req.body;
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    const decoded = jwt.verify(token, SECRET);
    if (decoded.role !== "admin") return res.status(403).json({ error: "Access denied" });

    const users = loadUsers();
    const user = users.find(u => u.id === id);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.approved = true;
    saveUsers(users);
    logAction(decoded.email, "approved", user);
    res.json({ message: "User approved." });
  } catch {
    res.status(403).json({ error: "Invalid token" });
  }
});

// POST /auth/reject-user
router.post("/reject-user", (req, res) => {
  const { id } = req.body;
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    const decoded = jwt.verify(token, SECRET);
    if (decoded.role !== "admin") return res.status(403).json({ error: "Access denied" });

    const users = loadUsers();
    const user = users.find(u => u.id === id);
    if (!user) return res.status(404).json({ error: "User not found" });

    logAction(decoded.email, "rejected", user);
    const updated = users.filter(u => u.id !== id);
    saveUsers(updated);
    res.json({ message: "User rejected and removed." });
  } catch {
    res.status(403).json({ error: "Invalid token" });
  }
});

// GET /auth/logs
router.get("/logs", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    const decoded = jwt.verify(token, SECRET);
    if (decoded.role !== "admin") return res.status(403).json({ error: "Access denied" });

    const logs = fs.existsSync(LOG_FILE) ? JSON.parse(fs.readFileSync(LOG_FILE, "utf8")) : [];
    res.json(logs);
  } catch {
    res.status(403).json({ error: "Invalid token" });
  }
});

module.exports = router;