// database.js
const Database = require("better-sqlite3");
const db = new Database("backend/teleDoctor.db");

// --- USERS ---

// Create a new user (for registration)
exports.createUser = (user) => {
  const stmt = db.prepare(`
    INSERT INTO users (name, email, password, role, approved)
    VALUES (?, ?, ?, ?, ?)
  `);
  return stmt.run(user.name, user.email, user.password, user.role, user.approved ? 1 : 0);
};

// Find user by email (for login)
exports.getUserByEmail = (email) => {
  const stmt = db.prepare(`
    SELECT * FROM users WHERE email = ?
  `);
  return stmt.get(email);
};

// Approve user
exports.approveUser = (id) => {
  const stmt = db.prepare(`
    UPDATE users SET approved = 1 WHERE id = ?
  `);
  return stmt.run(id);
};

// Reject (delete) user
exports.rejectUser = (id) => {
  const stmt = db.prepare(`
    DELETE FROM users WHERE id = ?
  `);
  return stmt.run(id);
};

// Get all pending users
exports.getPendingUsers = () => {
  const stmt = db.prepare(`
    SELECT * FROM users WHERE approved = 0
  `);
  return stmt.all();
};

// --- LOGS ---

// Log admin action
exports.logAction = (adminEmail, action, targetEmail) => {
  const stmt = db.prepare(`
    INSERT INTO logs (admin_email, action, target_email)
    VALUES (?, ?, ?)
  `);
  return stmt.run(adminEmail, action, targetEmail);
};

// Get all logs
exports.getLogs = () => {
  const stmt = db.prepare(`
    SELECT * FROM logs ORDER BY timestamp DESC
  `);
  return stmt.all();
};

// --- DIAGNOSES ---

// Save a diagnosis for a user
exports.saveDiagnosis = (userId, textInput, diagnosis, imagePath) => {
  const stmt = db.prepare(`
    INSERT INTO diagnoses (user_id, text_input, diagnosis, image_path)
    VALUES (?, ?, ?, ?)
  `);
  return stmt.run(userId, textInput, diagnosis, imagePath);
};

// --- DOCTOR PROFILES ---

// Update doctor's clinic info
exports.updateDoctorProfile = (userId, { clinic_logo, address, phone, working_hours, bio }) => {
  const stmt = db.prepare(`
    UPDATE users
    SET clinic_logo = ?, address = ?, phone = ?, working_hours = ?, bio = ?
    WHERE id = ? AND role = 'doctor'
  `);
  return stmt.run(clinic_logo, address, phone, working_hours, bio, userId);
};

// Get doctor profile by ID
exports.getDoctorProfile = (userId) => {
  const stmt = db.prepare(`
    SELECT name, email, clinic_logo, address, phone, working_hours, bio
    FROM users
    WHERE id = ? AND role = 'doctor'
  `);
  return stmt.get(userId);
};

// Get all approved doctors
exports.getApprovedDoctors = () => {
  const stmt = db.prepare(`
    SELECT id, name, clinic_logo, address, phone, working_hours, bio
    FROM users
    WHERE role = 'doctor' AND approved = 1
  `);
  return stmt.all();
};

// --- PATIENTS ---

// Save a new patient (already seeded patients are there)
exports.createPatient = (patient) => {
  const stmt = db.prepare(`
    INSERT INTO patients (name, gender, age, religion, language, medical_history, fyda_id, assigned_doctor_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  return stmt.run(
    patient.name,
    patient.gender,
    patient.age,
    patient.religion,
    patient.language,
    patient.medical_history,
    patient.fyda_id,
    patient.assigned_doctor_id
  );
};

// Get patient brief history for doctor view
exports.getPatientBriefHistory = (patientId) => {
  const stmt = db.prepare(`
    SELECT id, name, gender, age, language, religion, medical_history
    FROM patients
    WHERE id = ?
  `);
  return stmt.get(patientId);
};

// Get all patients assigned to a specific doctor
exports.getPatientsForDoctor = (doctorId) => {
  const stmt = db.prepare(`
    SELECT id, name, gender, age, language, religion
    FROM patients
    WHERE assigned_doctor_id = ?
  `);
  return stmt.all(doctorId);
};