const express = require("express");
const cors = require("cors");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const path = require("path");
const axios = require("axios");

dotenv.config();
const app = express();
const PORT = 3000;
const USERS_FILE = path.join(__dirname, "users.json");
const LOGS_FILE = path.join(__dirname, "logs.json");
const UPLOAD_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(bodyParser.json({ limit: "10mb" }));
app.use("/uploads", express.static(UPLOAD_DIR));

function authMiddleware(req, res, next) {
  const token = req.headers["authorization"];
  if (!token) return res.status(403).json({ error: "No token provided" });
  try {
    const decoded = jwt.verify(token.split(" ")[1], process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid token" });
  }
}

function loadUsers() {
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE));
  } catch {
    return [];
  }
}
function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}
function logAction(admin, action, user) {
  const logs = fs.existsSync(LOGS_FILE) ? JSON.parse(fs.readFileSync(LOGS_FILE)) : [];
  logs.push({ timestamp: new Date(), admin, action, target: user });
  fs.writeFileSync(LOGS_FILE, JSON.stringify(logs, null, 2));
}

app.post("/auth/register", (req, res) => {
  const users = loadUsers();
  const { name, email, password, role } = req.body;
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ error: "User already exists." });
  }
  const newUser = {
    id: Date.now(),
    name,
    email,
    password: bcrypt.hashSync(password, 10),
    role,
    approved: false
  };
  users.push(newUser);
  saveUsers(users);
  res.json({ message: "User registered. Awaiting approval." });
});

app.post("/auth/login", (req, res) => {
  const users = loadUsers();
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: "Invalid email or password." });
  }
  if (!user.approved) {
    return res.status(403).json({ error: "Your account is pending approval." });
  }
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "24h"
  });
  res.json({ token, role: user.role });
});

app.get("/pending", authMiddleware, (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Access denied." });
  const users = loadUsers();
  const pending = users.filter(u => !u.approved);
  res.json(pending);
});

app.post("/pending/:id", authMiddleware, (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Admins only." });
  let users = loadUsers();
  const id = parseInt(req.params.id);
  const action = req.body.action;
  const user = users.find(u => u.id === id);
  if (!user) return res.status(404).json({ error: "User not found." });
  if (action === "approve") {
    user.approved = true;
    saveUsers(users);
    logAction(req.user.email, "approved", user);
    return res.json({ message: "User approved." });
  }
  if (action === "reject") {
    users = users.filter(u => u.id !== id);
    saveUsers(users);
    logAction(req.user.email, "rejected", user);
    return res.json({ message: "User rejected and removed." });
  }
  res.status(400).json({ error: "Invalid action." });
});

app.get("/logs", authMiddleware, (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Admins only." });
  try {
    const logs = JSON.parse(fs.readFileSync(LOGS_FILE));
    res.json(logs);
  } catch {
    res.json([]);
  }
});

app.post("/diagnose", authMiddleware, async (req, res) => {
  const { text, imageData } = req.body;
  if (!text) return res.status(400).json({ error: "Missing input text" });

  let savedImage = null;
  if (imageData && imageData.startsWith("data:image")) {
    const base64 = imageData.split(',')[1];
    const filename = `image_${Date.now()}.png`;
    const filepath = path.join(UPLOAD_DIR, filename);
    fs.writeFileSync(filepath, base64, 'base64');
    savedImage = filename;
    console.log("📁 Image saved as:", filename);
  }

  try {
    const response = await axios.post(
      `${process.env.OPENAI_API_BASE}/chat/completions`,
      {
        model: "openai/gpt-3.5-turbo",
        messages: [{ role: "user", content: text }]
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    res.json({ diagnosis: response.data.choices[0].message.content, image: savedImage });
  } catch (err) {
    console.error("❌ AI Error:", JSON.stringify(err.response?.data || err.message, null, 2));
    res.status(500).json({ error: "AI failed", details: err.response?.data || err.message });
  }
});

app.listen(PORT, () => {
  console.log("🔐 API Key Loaded:", process.env.OPENAI_API_KEY ? "✅ yes" : "❌ missing");
  console.log(`✅ Server is running at http://localhost:${PORT}`);
});
