const Database = require('better-sqlite3');
const db = new Database('backend/teleDoctor.db');

// Sample doctor data
const doctors = [
    {
        name: "Dr. Amanuel Bekele",
        email: "amanuel.bekele@example.com",
        phone: "+251911123456",
        address: "Bole Medhanialem, Addis Ababa",
        specialization: "Cardiologist",
        experience_years: 12,
        bio: "Experienced cardiologist with a focus on preventative care.",
        working_hours: "Mon-Fri 9:00 AM - 5:00 PM",
        logo_url: "/images/clinic1.png"
    },
    {
        name: "Dr. Fatuma Ahmed",
        email: "fatuma.ahmed@example.com",
        phone: "+251922654321",
        address: "Arat Kilo, Addis Ababa",
        specialization: "Pediatrician",
        experience_years: 8,
        bio: "Dedicated to child health and wellness.",
        working_hours: "Mon-Sat 8:00 AM - 4:00 PM",
        logo_url: "/images/clinic2.png"
    },
    {
        name: "Dr. Tesfaye Lemma",
        email: "tesfaye.lemma@example.com",
        phone: "+251933112233",
        address: "Piassa, Addis Ababa",
        specialization: "Dermatologist",
        experience_years: 10,
        bio: "Specialist in skin conditions and cosmetic dermatology.",
        working_hours: "Tue-Sun 10:00 AM - 6:00 PM",
        logo_url: "/images/clinic3.png"
    }
];

// Prepare the insert statement
const insert = db.prepare(`
    INSERT INTO doctors (name, email, phone, address, specialization, experience_years, bio, working_hours, logo_url)
    VALUES (@name, @email, @phone, @address, @specialization, @experience_years, @bio, @working_hours, @logo_url)
`);

// Use transaction for safe bulk insert
const insertMany = db.transaction((doctors) => {
    for (const doctor of doctors) insert.run(doctor);
});

// Execute
try {
    insertMany(doctors);
    console.log("✅ Successfully seeded doctors");
} catch (error) {
    console.error("❌ Failed to seed doctors:", error.message);
} finally {
    db.close();
}