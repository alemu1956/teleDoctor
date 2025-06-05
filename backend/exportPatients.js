const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

// Connect to your database
const db = new sqlite3.Database('./teleDoctor.db');

// Query all patients
db.all('SELECT * FROM patients', [], (err, rows) => {
    if (err) {
        console.error('Failed to fetch patients:', err.message);
        return;
    }

    // Write to patients.json
    fs.writeFileSync('patients.json', JSON.stringify(rows, null, 2));
    console.log('✅ Exported patients to patients.json');

    // Close the database
    db.close();
});