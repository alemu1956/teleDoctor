# 🩺 teleDoctor

**teleDoctor** is an AI-powered web application that allows users to speak their symptoms, convert speech to text, and receive intelligent diagnostic suggestions from ChatGPT. It combines frontend speech recognition with a backend-integrated OpenAI API to deliver secure, fast, and informative results.

---

## 🔧 Features

- 🎙️ Record voice using browser speech recognition  
- 📝 Auto-transcribe voice to text  
- 🤖 Send diagnosis text securely to ChatGPT via backend  
- 📤 Display AI-generated medical responses  
- 🔒 Backend-secured API key (never exposed on frontend)

---

## 📁 Project Structure

```bash
teleDoctor/
├── backend/            # Express server (API & OpenAI logic)
│   ├── server.js
│   ├── package.json
│   ├── .env            # Contains your OpenAI API key (excluded from Git)
│   ├── models/         # Future: schema or logic modules
│   └── routes/         # Future: modular route handling
├── frontend/           # Static HTML frontend
│   └── doctor.html
├── data/               # (Optional) JSON or diagnosis files
├── docs/               # Documentation, diagrams, etc.
└── README.md