// src/PatientPortal.jsx
import React, { useState } from 'react';
import axios from 'axios';

export default function PatientPortal() {
  const [token, setToken] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [search, setSearch] = useState('');
  const [patient, setPatient] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);
  const [symptoms, setSymptoms] = useState('');
  const [imageData, setImageData] = useState(null);
  const [diagnosis, setDiagnosis] = useState('');

  const login = async () => {
    try {
      const res = await axios.post('http://localhost:3000/auth/login', { email, password });
      setToken(res.data.token);
      setError(null);
    } catch (err) {
      setError('Login failed. Check credentials or approval status.');
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`http://localhost:3000/api/patient/${search}`);
      setPatient(res.data.patient);
      setHistory(res.data.history);
      setError(null);
    } catch (err) {
      setError('Patient not found or server error.');
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setImageData(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const submitDiagnosis = async () => {
    try {
      const res = await axios.post(
        'http://localhost:3000/diagnose',
        { text: symptoms, imageData },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDiagnosis(res.data.diagnosis);
    } catch (err) {
      setDiagnosis('Failed to get diagnosis.');
    }
  };

  if (!token) {
    return (
      <div style={{ maxWidth: '400px', margin: 'auto', paddingTop: '2rem' }}>
        <h2>Doctor Login</h2>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: '100%', marginBottom: '10px', padding: '8px' }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: '100%', marginBottom: '10px', padding: '8px' }}
        />
        <button onClick={login} style={{ width: '100%', padding: '10px' }}>
          Login
        </button>
        {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: 'auto', paddingTop: '2rem' }}>
      <h2>Search Patient</h2>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Enter Amharic Name (e.g., አቤቱ ደመቀ)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, padding: '8px' }}
        />
        <button onClick={fetchHistory} style={{ padding: '8px 16px' }}>
          Search
        </button>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {patient && (
        <div style={{ border: '1px solid #ccc', padding: '1rem', borderRadius: '8px' }}>
          <h3>{patient.full_name}</h3>
          <p><strong>DOB:</strong> {patient.date_of_birth}</p>
          <p><strong>Gender:</strong> {patient.gender}</p>
          <p><strong>Address:</strong> {patient.address}</p>
          <h4 style={{ marginTop: '1rem' }}>Recent Visits:</h4>
          <ul>
            {history.map((h, i) => (
              <li key={i}>
                <p><strong>{h.visit_date.split('T')[0]}</strong>: {h.diagnosis} – {h.treatment}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid #ccc' }}>
        <h3>Submit New Diagnosis</h3>

        <textarea
          rows={4}
          placeholder="Describe symptoms here..."
          value={symptoms}
          onChange={(e) => setSymptoms(e.target.value)}
          style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
        />

        <input type="file" accept="image/*" onChange={handleImageUpload} />
        {imageData && <img src={imageData} alt="Preview" style={{ marginTop: '10px', maxWidth: '100%' }} />}

        <button onClick={submitDiagnosis} style={{ marginTop: '10px', padding: '10px' }}>
          Submit to AI
        </button>

        {diagnosis && (
          <div style={{ marginTop: '1rem', padding: '10px', background: '#f0f0f0' }}>
            <strong>AI Diagnosis:</strong>
            <p>{diagnosis}</p>
          </div>
        )}
      </div>
    </div>
  );
}
