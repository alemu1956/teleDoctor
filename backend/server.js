// server.js
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const path = require("path");
const axios = require("axios");
const sqlite3 = require("sqlite3").verbose();
const multer = require("multer");

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;
const USERS_FILE = path.join(__dirname, "users.json");
const LOGS_FILE = path.join(__dirname, "logs.json");

app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "../frontend-static")));

// SQLite DB setup
const db = new sqlite3.Database("teledoctor.db", err => {
    if (err) console.error("❌ DB Error:", err.message);
    else console.log("✅ Connected to SQLite DB");
});

// Auth middleware
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

// Register route
app.post("/auth/register", (req, res) => {
    const users = loadUsers();
    const { name, email, password, role, cert, address } = req.body;
    if (users.find(u => u.email === email)) return res.status(400).json({ error: "User already exists." });

    const newUser = {
        id: Date.now(), name, email,
        password: bcrypt.hashSync(password, 10),
        role, cert, address, approved: false
    };
    users.push(newUser);
    saveUsers(users);
    res.json({ message: "User registered. Awaiting approval." });
});

// Login route
app.post("/auth/login", (req, res) => {
    const users = loadUsers();
    const { email, password } = req.body;
    const user = users.find(u => u.email === email);
    if (!user || !bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: "Invalid email or password." });
    if (!user.approved) return res.status(403).json({ error: "Your account is pending approval." });

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: "24h" });
    res.json({ token, role: user.role });
});

// Pending users
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

// View logs
app.get("/logs", authMiddleware, (req, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Admins only." });
    try {
        const logs = JSON.parse(fs.readFileSync(LOGS_FILE));
        res.json(logs);
    } catch {
        res.json([]);
    }
});

// AI Diagnosis
app.post("/diagnose", authMiddleware, async (req, res) => {
    const inputText = req.body.text;
    if (!inputText) return res.status(400).json({ error: "Missing input text" });

    try {
        const response = await axios.post(`${process.env.OPENAI_API_BASE}/chat/completions`, {
            model: "openai/gpt-3.5-turbo",
            messages: [{ role: "user", content: inputText }]
        }, {
            headers: {
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                "Content-Type": "application/json"
            }
        });

        const diagnosis = response.data.choices[0].message.content;
        res.json({ diagnosis });
    } catch (err) {
        res.status(500).json({ error: "AI failed", details: err.response?.data || err.message });
    }
});

// Upload and transcribe using local Whisper API
const storage = multer.memoryStorage();
const upload = multer({ storage });

app.post("/transcribe", authMiddleware, upload.single("audio"), async (req, res) => {
    const audioBuffer = req.file?.buffer;
    const language = req.body.language || "am";

    if (!audioBuffer) return res.status(400).json({ error: "No audio file uploaded" });

    try {
        const formData = new FormData();
        formData.append("file", audioBuffer, "audio.webm");
        formData.append("language", language);

        const whisperResponse = await axios.post("http://localhost:9000/transcribe", formData, {
            headers: formData.getHeaders()
        });

        const local = whisperResponse.data.text;

        const translation = await axios.post(
            `${process.env.OPENAI_API_BASE}/chat/completions`,
            {
                model: "openai/gpt-3.5-turbo",
                messages: [
                    { role: "system", content: "Translate this to English:" },
                    { role: "user", content: local }
                ]
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                    "Content-Type": "application/json"
                }
            }
        );

        const english = translation.data.choices[0].message.content;
        res.json({ local, english });
    } catch (err) {
        console.error("❌ Transcription error:", err);
        res.status(500).json({ error: "Transcription failed", details: err.response?.data || err.message });
    }
});

// Start server
app.listen(PORT, () => {
    console.log("🔐 API Key Loaded:", process.env.OPENAI_API_KEY ? "✅ yes" : "❌ missing");
    console.log(`✅ Server is running at http://localhost:${PORT}`);
});