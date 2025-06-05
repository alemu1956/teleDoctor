// src/pages/Dashboard.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ReactMic } from 'react-mic';

function Dashboard() {
    const navigate = useNavigate();

    const [recording, setRecording] = useState(false);
    const [recordedBlob, setRecordedBlob] = useState(null);
    const [audioURL, setAudioURL] = useState(null);
    const [transcription, setTranscription] = useState('');
    const [diagnosis, setDiagnosis] = useState('');
    const [loading, setLoading] = useState(false);

    const startRecording = () => {
        setRecording(true);
        setTranscription('');
        setDiagnosis('');
    };

    const stopRecording = () => {
        setRecording(false);
    };

    const onStop = (recordedData) => {
        console.log('Recording stopped, blob:', recordedData.blob);
        setRecordedBlob(recordedData.blob);
        setAudioURL(URL.createObjectURL(recordedData.blob));
    };

    const uploadRecording = async () => {
        if (!recordedBlob) {
            alert('Please record audio first.');
            return;
        }

        const formData = new FormData();
        formData.append('audio', recordedBlob, 'recording.wav');

        try {
            setLoading(true);

            // Upload the recording
            const uploadResponse = await fetch('http://localhost:3001/api/upload', {
                method: 'POST',
                body: formData,
            });

            const uploadResult = await uploadResponse.json();
            console.log('Upload result:', uploadResult);

            if (uploadResponse.ok) {
                const { filePath } = uploadResult;

                // Transcribe the uploaded audio
                const transcribeResponse = await fetch('http://localhost:3001/api/transcribe', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ filePath }),
                });

                const transcribeResult = await transcribeResponse.json();
                console.log('Transcription result:', transcribeResult);

                if (transcribeResponse.ok) {
                    setTranscription(transcribeResult.transcription);

                    // Diagnose based on transcription
                    const diagnoseResponse = await fetch('http://localhost:3001/api/diagnose', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ transcription: transcribeResult.transcription }),
                    });

                    const diagnoseResult = await diagnoseResponse.json();
                    console.log('Diagnosis result:', diagnoseResult);

                    if (diagnoseResponse.ok) {
                        setDiagnosis(diagnoseResult.diagnosis);
                    } else {
                        throw new Error('Failed to get diagnosis.');
                    }
                } else {
                    throw new Error('Failed to transcribe.');
                }
            } else {
                throw new Error('Failed to upload.');
            }
        } catch (error) {
            console.error('Error during upload/transcribe/diagnose:', error);
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gray-100 p-8 flex flex-col items-center">
            <h1 className="text-3xl font-bold mb-6 text-indigo-600">Doctor's Dashboard</h1>

            <div className="mb-6">
                <ReactMic
                    record={recording}
                    className="w-full h-24"
                    onStop={onStop}
                    strokeColor="#4F46E5"
                    backgroundColor="#E0E7FF"
                />
            </div>

            <div className="flex gap-4 mb-6">
                {!recording ? (
                    <button
                        onClick={startRecording}
                        className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600 transition"
                    >
                        Start Recording
                    </button>
                ) : (
                    <button
                        onClick={stopRecording}
                        className="bg-red-500 text-white px-6 py-2 rounded hover:bg-red-600 transition"
                    >
                        Stop Recording
                    </button>
                )}

                <button
                    onClick={uploadRecording}
                    disabled={!recordedBlob || loading}
                    className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 transition disabled:opacity-50"
                >
                    Upload & Diagnose
                </button>

                <button
                    onClick={handleLogout}
                    className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600 transition"
                >
                    Logout
                </button>
            </div>

            {/* Playback */}
            {audioURL && (
                <div className="mb-6">
                    <audio controls src={audioURL}></audio>
                </div>
            )}

            {/* Transcription Result */}
            {transcription && (
                <div className="w-full max-w-2xl mb-4">
                    <h2 className="text-xl font-bold mb-2 text-indigo-600">Transcription:</h2>
                    <div className="p-4 bg-white shadow rounded">{transcription}</div>
                </div>
            )}

            {/* Diagnosis Result */}
            {diagnosis && (
                <div className="w-full max-w-2xl mb-4">
                    <h2 className="text-xl font-bold mb-2 text-indigo-600">AI Diagnosis:</h2>
                    <div className="p-4 bg-white shadow rounded">{diagnosis}</div>
                </div>
            )}

            {/* Loading Spinner */}
            {loading && <div className="text-indigo-600 text-xl">Processing...</div>}
        </div>
    );
}

export default Dashboard;