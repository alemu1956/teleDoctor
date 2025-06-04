// seedPatients.js
const { faker } = require('@faker-js/faker');
const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');

// Initialize database
const db = new Database('teleDoctor.db');

// Drop and recreate patients table
db.prepare(`DROP TABLE IF EXISTS patients`).run();
db.prepare(`
  CREATE TABLE patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    gender TEXT NOT NULL,
    age INTEGER NOT NULL,
    religion TEXT NOT NULL,
    language TEXT NOT NULL,
    medical_history TEXT NOT NULL,
    fyda_id TEXT UNIQUE NOT NULL,
    assigned_doctor_id TEXT
  )
`).run();

// Generate and insert fake patients
const saltRounds = 10;
const insert = db.prepare(`
  INSERT INTO patients 
  (name, email, password, gender, age, religion, language, medical_history, fyda_id, assigned_doctor_id)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

// Ethiopian realistic mock data
const maleNames = ["Abebe", "Bekele", "Dawit", "Fikru", "Getachew", "Haile", "Kebede", "Tesfaye", "Mekonnen"];
const femaleNames = ["Aster", "Blen", "Chaltu", "Dagmawit", "Eleni", "Fikirte", "Hanna", "Lily", "Mekdes"];
const religions = ["Orthodox", "Muslim", "Protestant", "Catholic"];
const languages = ["Amharic", "Oromiffa", "Tigrigna", "Somali"];
const diseases = [
    "Diabetes", "Hypertension", "Asthma", "Chronic Kidney Disease",
    "Rheumatoid Arthritis", "Tuberculosis", "Epilepsy", "Malaria history",
    "HIV/AIDS", "Cancer"
];

// Helper to generate random Fyda ID
const generateFydaId = () => {
    return 'FD-' + faker.string.alphanumeric({ length: 8, casing: 'upper' });
};

// Randomly assign gender-appropriate names
function getRandomName(gender) {
    if (gender === "Male") {
        return faker.helpers.arrayElement(maleNames) + " " + faker.person.lastName();
    } else {
        return faker.helpers.arrayElement(femaleNames) + " " + faker.person.lastName();
    }
}

// Start transaction
db.prepare('BEGIN').run();

try {
    for (let i = 0; i < 100; i++) {
        const gender = faker.helpers.arrayElement(["Male", "Female"]);
        const name = getRandomName(gender);
        const email = faker.internet.email({ firstName: name.split(' ')[0], lastName: name.split(' ')[1] });
        const password = bcrypt.hashSync('password123', saltRounds); // default password for all
        const age = faker.number.int({ min: 1, max: 80 });
        const religion = faker.helpers.arrayElement(religions);
        const language = faker.helpers.arrayElement(languages);

        const illnessCount = faker.number.int({ min: 1, max: 3 });
        const medical_history = faker.helpers.arrayElements(diseases, illnessCount).join(', ');
        const fyda_id = generateFydaId();
        const assigned_doctor_id = null; // initially not assigned

        insert.run(name, email.toLowerCase(), password, gender, age, religion, language, medical_history, fyda_id, assigned_doctor_id);
        console.log(`Created patient: ${name}, Age: ${age}, Language: ${language}`);
    }

    // Commit transaction
    db.prepare('COMMIT').run();
    console.log('✅ Successfully seeded 100 patients');
} catch (err) {
    // Rollback on error
    db.prepare('ROLLBACK').run();
    console.error('❌ Seeding failed:', err.message);
} finally {
    db.close();
}