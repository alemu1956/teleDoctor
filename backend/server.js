// server.js
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

const app = express();
const port = 3001;

// Middlewares
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer Setup for File Uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Folder where uploads are stored
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${Date.now()}${ext}`);
    },
});
const upload = multer({ storage });

// Dummy login route
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    if (username === 'doctor' && password === 'password123') {
        res.json({ message: 'Login successful', user: { username: 'doctor', role: 'doctor' } });
    } else {
        res.status(401).json({ message: 'Invalid credentials' });
    }
});

// Upload route
app.post('/api/upload', upload.single('audio'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    res.json({ message: 'File uploaded successfully', filePath: `/uploads/${req.file.filename}` });
});

// Dummy transcription route
app.post('/api/transcribe', (req, res) => {
    const { filePath } = req.body;

    if (!filePath) {
        return res.status(400).json({ message: 'No file path provided' });
    }

    // Simulate transcription (Replace with real Whisper API later)
    const simulatedTranscript = "This is a dummy transcription from the uploaded audio.";

    res.json({ transcription: simulatedTranscript });
});

// Dummy AI diagnosis route
app.post('/api/diagnose', (req, res) => {
    const { transcription } = req.body;

    if (!transcription) {
        return res.status(400).json({ message: 'No transcription provided' });
    }

    // Simulate AI diagnosis (Replace with real AI model later)
    const simulatedDiagnosis = "Based on the symptoms, the patient might have seasonal flu.";

    res.json({ diagnosis: simulatedDiagnosis });
});

// Start server
app.listen(port, () => {
    console.log(`🚀 Server running at http://localhost:${port}`);
});