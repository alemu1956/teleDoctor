const path = require("path");
const Database = require("better-sqlite3");

// Full absolute path to teleDoctor.db
const dbPath = path.join(__dirname, "teleDoctor.db");
const db = new Database(dbPath);

// USERS
exports.createUser = (user) => {
  const stmt = db.prepare(`INSERT INTO users (name, email, password, role, approved)
                          VALUES (?, ?, ?, ?, ?)`);
  return stmt.run(user.name, user.email, user.password, user.role, user.approved ? 1 : 0);
};

exports.getUserByEmail = (email) => {
  const stmt = db.prepare("SELECT * FROM users WHERE email = ?");
  return stmt.get(email);
};

exports.approveUser = (id) => {
  const stmt = db.prepare("UPDATE users SET approved = 1 WHERE id = ?");
  return stmt.run(id);
};

exports.rejectUser = (id) => {
  const stmt = db.prepare("DELETE FROM users WHERE id = ?");
  return stmt.run(id);
};

exports.getPendingUsers = () => {
  const stmt = db.prepare("SELECT * FROM users WHERE approved = 0");
  return stmt.all();
};

// LOGS
exports.logAction = (adminEmail, action, targetEmail) => {
  const stmt = db.prepare(`INSERT INTO logs (admin_email, action, target_email)
                          VALUES (?, ?, ?)`);
  return stmt.run(adminEmail, action, targetEmail);
};

exports.getLogs = () => {
  const stmt = db.prepare("SELECT * FROM logs ORDER BY timestamp DESC");
  return stmt.all();
};

// DIAGNOSES
exports.saveDiagnosis = (userId, textInput, diagnosis, imagePath) => {
  const stmt = db.prepare(`INSERT INTO diagnoses (user_id, text_input, diagnosis, image_path)
                          VALUES (?, ?, ?, ?)`);
  return stmt.run(userId, textInput, diagnosis, imagePath);
};

// PATIENTS
exports.insertPatient = (patient) => {
  const stmt = db.prepare(`
    INSERT INTO patients (fyda_id, full_name, gender, age, religion, medical_history)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  return stmt.run(
    patient.fyda_id,
    patient.full_name,
    patient.gender,
    patient.age,
    patient.religion,
    patient.medical_history
  );
};

exports.getPatientByFydaId = (fydaId) => {
  const stmt = db.prepare("SELECT * FROM patients WHERE fyda_id = ?");
  return stmt.get(fydaId);
};

exports.getAllPatients = () => {
  const stmt = db.prepare("SELECT * FROM patients");
  return stmt.all();
};