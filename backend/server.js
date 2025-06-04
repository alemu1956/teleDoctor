require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

const app = express();
const PORT = 3000;

// ✅ Serve Static Frontend
app.use(express.static(path.join(__dirname, '..', 'frontend-static')));

// Create temp directory if not exists
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

// Middlewares
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Length', 'Content-Range']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// File upload setup
const tempStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, tempDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-recording.webm';
        cb(null, uniqueName);
    }
});
const upload = multer({ storage: tempStorage });

// Authentication middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

// 🔐 Auth Routes (Temporary in-memory users)
const users = [];

// Register
app.post('/auth/register', async (req, res) => {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    if (users.some(u => u.email === email)) {
        return res.status(400).json({ error: 'Email already registered' });
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = {
            id: Date.now().toString(),
            name,
            email,
            password: hashedPassword,
            role
        };

        users.push(newUser);
        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login
app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;

    const user = users.find(u => u.email === email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    try {
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({ token, role: user.role });
    } catch (err) {
        res.status(500).json({ error: 'Login failed' });
    }
});

// 📥 Upload and save audio to temp folder
app.post('/record', authenticateToken, upload.single('audio'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No audio file uploaded' });
    }

    res.json({ message: 'Audio saved successfully', filename: req.file.filename });
});

// 🧠 Transcribe and Save Diagnosis
app.post('/transcribe', authenticateToken, async (req, res) => {
    const { filename, language } = req.body;

    if (!filename || !language) {
        return res.status(400).json({ error: 'Missing filename or language' });
    }

    const audioPath = path.join(tempDir, filename);

    if (!fs.existsSync(audioPath)) {
        return res.status(404).json({ error: 'Audio file not found' });
    }

    try {
        const formData = new FormData();
        formData.append('audio', fs.createReadStream(audioPath));
        formData.append('language', language);

        const whisperResponse = await axios.post('http://localhost:8001/transcribe', formData, {
            headers: {
                ...formData.getHeaders()
            },
            timeout: 60000,
        });

        const { local, english } = whisperResponse.data;

        const diagnosisData = { local, english };
        fs.writeFileSync(path.join(tempDir, 'latest-diagnosis.json'), JSON.stringify(diagnosisData, null, 2));

        res.json({ local, english });

    } catch (err) {
        console.error('Transcription error:', err);
        if (err.response) {
            res.status(500).json({
                error: `Transcription service error: ${err.response.status}`,
                details: err.response.data
            });
        } else {
            res.status(500).json({ error: 'Failed to transcribe and translate.' });
        }
    }
});

// 🏥 Doctor panel: Load latest recording
app.get('/latest-recording', authenticateToken, (req, res) => {
    fs.readdir(tempDir, (err, files) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to read recordings.' });
        }

        const recordingFiles = files.filter(file => file.endsWith('.webm'));
        if (recordingFiles.length === 0) {
            return res.status(404).json({ error: 'No recordings found.' });
        }

        const latestFile = recordingFiles.sort((a, b) => {
            return fs.statSync(path.join(tempDir, b)).mtime.getTime() -
                fs.statSync(path.join(tempDir, a)).mtime.getTime();
        })[0];

        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        res.sendFile(path.join(tempDir, latestFile), {
            headers: {
                'Content-Type': 'audio/webm',
                'Content-Disposition': `inline; filename="${latestFile}"`
            }
        });
    });
});

// 📝 Doctor panel: Load latest diagnosis
app.get('/latest-diagnosis', authenticateToken, (req, res) => {
    try {
        const latestDiagnosis = fs.readFileSync(path.join(tempDir, 'latest-diagnosis.json'), 'utf-8');
        const data = JSON.parse(latestDiagnosis);
        res.json(data);
    } catch (err) {
        console.error('Error reading diagnosis:', err.message);
        res.status(404).json({ error: 'No diagnosis found' });
    }
});

// 404 Handler for API routes
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📁 Serving static files from frontend-static`);
    console.log(`🗂️ Temporary storage: ${tempDir}`);
});