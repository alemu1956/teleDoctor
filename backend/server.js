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
const ffmpeg = require('fluent-ffmpeg');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;
const USERS_FILE = path.join(__dirname, "users.json");

// Middleware to parse JSON bodies
app.use(express.json());

// Middleware to parse URL-encoded bodies (needed for multer text fields)
app.use(express.urlencoded({ extended: true }));

// Configure CORS with allowed origins from env
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

// Auth middleware - verify JWT token and attach user info
function authMiddleware(req, res, next) {
    const authHeader = req.headers["authorization"];
    if (!authHeader) return res.status(403).json({ error: "No token provided" });

    const token = authHeader.split(" ")[1];
    if (!token) return res.status(403).json({ error: "No token provided" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // includes id, email, role
        next();
    } catch (err) {
        console.error("JWT Error:", err.message);
        return res.status(403).json({ error: "Invalid token" });
    }
}

// Role check middleware - accepts array of roles allowed
function roleMiddleware(allowedRoles = []) {
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ error: "Unauthorized" });

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: "Access denied: insufficient permissions" });
        }
        next();
    };
}

// Registration route
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
        approved: true // For demo, auto-approved. Change as needed.
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

// Example protected route for doctors: get their patients (dummy example)
app.get('/doctor/patients', authMiddleware, roleMiddleware(['doctor']), (req, res) => {
    // For demo, return dummy patients assigned to this doctor
    res.json({
        doctorId: req.user.id,
        patients: [
            { id: 1, name: "John Doe", lastVisit: "2025-05-25" },
            { id: 2, name: "Jane Smith", lastVisit: "2025-05-20" }
        ]
    });
});

// Example protected route for patients: get their info
app.get('/patient/info', authMiddleware, roleMiddleware(['patient']), (req, res) => {
    // Return dummy patient info
    res.json({
        id: req.user.id,
        name: "Patient Example",
        conditions: ["Diabetes", "Hypertension"]
    });
});

// Example protected route for interpreters: get assigned sessions (dummy)
app.get('/interpreter/sessions', authMiddleware, roleMiddleware(['interpreter']), (req, res) => {
    res.json({
        interpreterId: req.user.id,
        sessions: [
            { id: 101, patientName: "John Doe", language: "Amharic", scheduled: "2025-06-05T14:00" }
        ]
    });
});

// Transcribe route - audio upload, convert webm->wav, whisper transcription, translation
app.post("/transcribe", authMiddleware, roleMiddleware(['doctor', 'patient']), upload.single("audio"), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No audio file uploaded" });

    // Prepare temp wav file path
    const tempWavPath = `uploads/${uuidv4()}.wav`;

    // Convert uploaded webm to wav
    ffmpeg(req.file.path)
        .toFormat('wav')
        .on('error', (err) => {
            console.error('FFmpeg conversion error:', err);
            res.status(500).json({ error: 'Failed to convert audio file' });
        })
        .on('end', async () => {
            try {
                const formData = new FormData();
                formData.append('file', fs.createReadStream(tempWavPath));
                formData.append('language', req.body?.language || 'en');

                // Call local whisper server
                const whisperResponse = await axios.post('http://localhost:8080/inference', formData, {
                    headers: formData.getHeaders()
                });

                const localText = whisperResponse.data.text || "";

                // Call OpenAI for translation
                const translationResponse = await axios.post(
                    `${process.env.OPENAI_API_BASE}/chat/completions`,
                    {
                        model: "gpt-3.5-turbo",
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

                // Delete temp files after processing
                fs.unlink(req.file.path, () => { });
                fs.unlink(tempWavPath, () => { });

                // Log transcription and translation
                console.log("Whisper transcription:", localText);
                console.log("English translation:", englishText);

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
        })
        .save(tempWavPath);
});

// Chat route - AI Q&A for follow-up and diagnosis
app.post('/chat', authMiddleware, roleMiddleware(['doctor', 'patient']), async (req, res) => {
    const messages = req.body.messages;
    if (!Array.isArray(messages)) {
        return res.status(400).json({ error: 'Messages must be an array' });
    }

    try {
        const response = await axios.post(
            `${process.env.OPENAI_API_BASE}/chat/completions`,
            {
                model: "gpt-3.5-turbo",
                messages: messages
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        const reply = response.data.choices[0].message.content;
        res.json({ reply });
    } catch (err) {
        console.error('Chat error:', err.response?.data || err.message);
        res.status(500).json({ error: 'Failed to get AI response' });
    }
});

// Diagnose route - full AI diagnosis with follow-up questions and suggestions
app.post('/diagnose', authMiddleware, roleMiddleware(['doctor', 'patient']), async (req, res) => {
    try {
        const messages = req.body.messages;
        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'Invalid messages format' });
        }

        const systemMessage = {
            role: 'system',
            content: `You are a helpful AI medical assistant. Engage the patient in a friendly, empathetic manner. Ask follow-up questions to clarify symptoms. After enough info is collected, provide a possible diagnosis and suggest medication or advice.`
        };

        const chatMessages = [systemMessage, ...messages];

        const response = await axios.post(
            `${process.env.OPENAI_API_BASE}/chat/completions`,
            {
                model: 'gpt-3.5-turbo',
                messages: chatMessages
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const aiReply = response.data.choices?.[0]?.message?.content || 'Sorry, no response from AI';

        res.json({ reply: aiReply });
    } catch (err) {
        console.error('Diagnose error:', err.response?.data || err.message);
        res.status(500).json({
            error: 'AI diagnosis failed',
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