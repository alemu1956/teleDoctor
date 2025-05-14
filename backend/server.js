// server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const OpenAI = require('openai');

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

let users = require('./users.json');
const logsFile = './logs.json';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_API_BASE || "https://api.openai.com/v1"
});

const authRoutes = require('./authRoutes');
app.use('/auth', authRoutes);

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(403).json({ error: 'Missing token' });

  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = decoded;
    next();
  });
}

app.post('/diagnose', verifyToken, async (req, res) => {
  const prompt = req.body.prompt;
  console.log("📥 Diagnose called with text:", prompt);
  console.log("🔐 Token from request:", req.headers.authorization);

  try {
    const completion = await openai.chat.completions.create({
      model: 'openai/gpt-3.5-turbo',
      messages: [{ role: "user", content: prompt }]
    });

    const reply = completion.choices[0].message.content;
    console.log("✅ AI replied:", reply);
    res.json({ reply });
  } catch (err) {
    if (err.response) {
      console.error("❌ AI Error (Response):", err.response.status, err.response.data);
    } else {
      console.error("❌ AI Error:", err.message);
    }
    res.status(500).json({ error: "AI failed", details: err.message });
  }
});

app.listen(3000, () => {
  console.log('✅ Server is running at http://localhost:3000');
});