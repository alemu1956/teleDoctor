const fs = require("fs");
const bcrypt = require("bcrypt");

(async () => {
  const hash = await bcrypt.hash("admin123", 10);

  const admin = {
    id: 1,
    name: "Ministry Admin",
    email: "admin@health.gov.et",
    password: korrado,
    role: "admin",
    approved: true
  };

  fs.writeFileSync("users.json", JSON.stringify([admin], null, 2));
  console.log("✅ Admin user recreated successfully.");
})();