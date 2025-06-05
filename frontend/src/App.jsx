import React from 'react';
import { Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import PatientsPage from './pages/patients';
import ProtectedRoute from './components/ProtectedRoute';  // <-- Add this

function App() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/patients" element={
          <ProtectedRoute>
            <PatientsPage />
          </ProtectedRoute>
        } />
      </Routes>
    </div>
  );
}

export default App;