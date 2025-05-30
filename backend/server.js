const express = require('express');
const cors = require('cors');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const path = require('path');
const axios = require('axios');
const multer = require('multer');
const FormData = require('form-data');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const USERS_FILE = path.join(__dirname, "users.json");

app.use(cors());

// CSP header to allow unsafe-eval and unsafe-inline for Tailwind CDN and inline scripts
app.use((req, res, next) => {
    res.setHeader(
        "Content-Security-Policy",
        "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.tailwindcss.com"
    );
    next();
});

app.use(express.json());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "../frontend-static")));

function authMiddleware(req, res, next) {
    const token = req.headers["authorization"];
    if (!token) return res.status(403).json({ error: "No token provided" });

    try {
        const decoded = jwt.verify(token.split(" ")[1], process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch {
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

// Register route
app.post("/auth/register", (req, res) => {
    const users = loadUsers();
    const { name, email, password, role } = req.body;
    if (users.find(u => u.email === email)) return res.status(400).json({ error: "User exists" });

    const newUser = {
        id: Date.now(),
        name,
        email,
        password: bcrypt.hashSync(password, 10),
        role,
        approved: true // auto approve for simplicity
    };
    users.push(newUser);
    saveUsers(users);
    res.json({ message: "Registered" });
});

// Login route
app.post("/auth/login", (req, res) => {
    const users = loadUsers();
    const { email, password } = req.body;
    const user = users.find(u => u.email === email);
    if (!user || !bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: "Invalid" });
    if (!user.approved) return res.status(403).json({ error: "Pending approval" });

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: "24h" });
    res.json({ token, role: user.role });
});

const upload = multer({ dest: 'uploads/' });

app.post("/transcribe", authMiddleware, upload.single("audio"), async (req, res) => {
    try {
        const formData = new FormData();
        formData.append('file', fs.createReadStream(req.file.path));
        if (req.body.language) {
            formData.append('language', req.body.language);
        }

        const whisperResponse = await axios.post('http://localhost:8080/inference', formData, {
            headers: formData.getHeaders()
        });

        res.json({
            local: whisperResponse.data.text,
            english: whisperResponse.data.text // placeholder for translation
        });
    } catch (err) {
        console.error('Transcription error:', err.message);
        res.status(500).json({ error: 'Transcription failed', details: err.response?.data || err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});