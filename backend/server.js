require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const FormData = require('form-data');

const app = express();
const PORT = process.env.PORT || 3000;
const USERS_FILE = path.join(__dirname, "users.json");

// Middleware
app.use(express.json());

// Configure CORS with allowed origins from environment variable
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : [];
app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true); // allow curl/postman without origin
        if (allowedOrigins.indexOf(origin) === -1) {
            return callback(new Error('CORS policy does not allow this origin'), false);
        }
        return callback(null, true);
    }
}));

// Serve frontend static files
app.use(express.static(path.join(__dirname, "../frontend-static")));

// Multer setup for file upload
const upload = multer({ dest: 'uploads/' });

// Helpers to load and save users
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

// Auth middleware - verify JWT token
function authMiddleware(req, res, next) {
    const authHeader = req.headers["authorization"];
    if (!authHeader) return res.status(403).json({ error: "No token provided" });

    const token = authHeader.split(" ")[1];
    if (!token) return res.status(403).json({ error: "No token provided" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        console.error('JWT Error:', err.message);
        return res.status(403).json({ error: "Invalid token" });
    }
}

// Registration route (demo purpose)
app.post("/auth/register", (req, res) => {
    const users = loadUsers();
    const { name, email, password, role } = req.body;

    if (users.find(u => u.email === email)) {
        return res.status(400).json({ error: "User already exists" });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const newUser = {
        id: Date.now(),
        name,
        email,
        password: hashedPassword,
        role,
        approved: true
    };

    users.push(newUser);
    saveUsers(users);
    res.json({ message: "Registered successfully" });
});

// Login route
app.post("/auth/login", (req, res) => {
    const users = loadUsers();
    const { email, password } = req.body;

    const user = users.find(u => u.email === email);
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    if (!bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ error: "Invalid credentials" });
    }

    if (!user.approved) {
        return res.status(403).json({ error: "Pending approval" });
    }

    const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "24h" }
    );

    res.json({ token, role: user.role });
});

// Transcribe route - audio upload, whisper transcription, translation
app.post("/transcribe", authMiddleware, upload.single("audio"), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No audio file uploaded" });

        const formData = new FormData();
        formData.append('file', fs.createReadStream(req.file.path));
        if (req.body.language) formData.append('language', req.body.language);

        // Call local whisper server
        const whisperResponse = await axios.post('http://localhost:8080/inference', formData, {
            headers: formData.getHeaders()
        });

        const localText = whisperResponse.data.text || "";

        // Log raw transcription from whisper server
        console.log("Whisper transcription:", localText);

        // Call OpenRouter/OpenAI for translation
        const translationResponse = await axios.post(
            `${process.env.OPENAI_API_BASE}/chat/completions`,
            {
                model: "openai/gpt-3.5-turbo",
                messages: [
                    { role: "system", content: "Translate this text to English." },
                    { role: "user", content: localText }
                ]
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                    "Content-Type": "application/json"
                }
            }
        );

        const englishText = translationResponse.data.choices?.[0]?.message?.content || "";

        // Delete temporary audio file after processing
        fs.unlink(req.file.path, (err) => {
            if (err) console.error("Failed to delete temp audio file:", err);
        });

        res.json({
            local: localText,
            english: englishText
        });
    } catch (err) {
        console.error('Transcription or translation error:', err.response?.data || err.message);
        res.status(500).json({
            error: 'Transcription or translation failed',
            details: err.response?.data || err.message
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log("JWT_SECRET loaded:", !!process.env.JWT_SECRET);
    console.log("OPENAI_API_KEY loaded:", !!process.env.OPENAI_API_KEY);
    console.log("OPENAI_API_BASE:", process.env.OPENAI_API_BASE);
});