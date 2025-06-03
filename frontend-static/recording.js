// ✅ recording.js — FINAL

const recordBtn = document.getElementById('record-btn');
const stopBtn = document.getElementById('stop-btn');
const submitBtn = document.getElementById('submit-btn');
const playback = document.getElementById('audio-playback');
const languageSelect = document.getElementById('language-select');
const transcriptionResult = document.getElementById('transcription-result');
const diagnosisResult = document.getElementById('diagnosis-result');
const logoutBtn = document.getElementById('logout-btn');

// Token check
const token = localStorage.getItem('token');
if (!token) {
    alert('Please login first!');
    window.location.href = '/login.html';
}

// Logout
logoutBtn.onclick = () => {
    localStorage.removeItem('token');
    window.location.href = '/login.html';
};

let mediaRecorder;
let audioChunks = [];
let lastSavedFilename = '';

recordBtn.onclick = async () => {
    console.log("✅ Start Recording button clicked");

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Your browser does not support audio recording.');
        console.log("❌ getUserMedia not supported");
        return;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log("🎤 Microphone stream opened");

        mediaRecorder = new MediaRecorder(stream);

        mediaRecorder.ondataavailable = event => {
            console.log("📥 Data available", event.data);
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
            console.log("🛑 Recording stopped");

            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            console.log("🎧 Audio Blob created", audioBlob);

            audioChunks = [];

            playback.src = URL.createObjectURL(audioBlob);

            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.webm');
            formData.append('language', languageSelect.value);

            try {
                console.log("📤 Sending recording to server");
                const response = await fetch('http://localhost:3000/record', {
                    method: 'POST',
                    headers: {
                        'Authorization': 'Bearer ' + token
                    },
                    body: formData
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error("❌ Upload failed", errorText);
                    throw new Error(errorText);
                }

                const data = await response.json();
                console.log("✅ Upload success", data);

                lastSavedFilename = data.filename;
                transcriptionResult.textContent = `Saved recording file: ${data.filename}`;
                diagnosisResult.textContent = 'You can now submit it for transcription and diagnosis!';
                submitBtn.disabled = false; // Enable the Submit button

            } catch (err) {
                console.error("❌ Upload error", err.message);
                transcriptionResult.textContent = 'Error: ' + err.message;
                diagnosisResult.textContent = '';
            }
        };

        mediaRecorder.start();
        console.log("🎬 Recording started");
        recordBtn.disabled = true;
        stopBtn.disabled = false;
        transcriptionResult.textContent = 'Recording...';
        diagnosisResult.textContent = '';
        playback.src = '';
        submitBtn.disabled = true;

    } catch (err) {
        alert('Could not start recording: ' + err.message);
        console.error("❌ Error starting recording", err.message);
    }
};

stopBtn.onclick = () => {
    console.log("🖐️ Stop Recording button clicked");
    mediaRecorder.stop();
    recordBtn.disabled = false;
    stopBtn.disabled = true;
};

// 📤 Submit Recording Button
submitBtn.onclick = async () => {
    console.log("📤 Submit Recording button clicked");

    if (!lastSavedFilename) {
        alert('No saved recording to submit!');
        return;
    }

    try {
        transcriptionResult.textContent = 'Transcribing and diagnosing...';
        diagnosisResult.textContent = '';

        const response = await fetch('http://localhost:3000/transcribe', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                filename: lastSavedFilename,
                language: languageSelect.value
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Unknown server error');
        }

        const data = await response.json();
        console.log("✅ Transcription and Diagnosis Success", data);

        transcriptionResult.textContent = `Local transcription:\n${data.local}`;
        diagnosisResult.textContent = `English translation:\n${data.english}`;

    } catch (err) {
        console.error("❌ Submit error", err.message);
        transcriptionResult.textContent = 'Error: ' + err.message;
        diagnosisResult.textContent = '';
    }
};