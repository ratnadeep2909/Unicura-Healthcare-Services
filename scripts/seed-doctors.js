const crypto = require("crypto");
const { MongoClient } = require("mongodb");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || "unicura";
const ENCRYPTION_SECRET = process.env.UNICURA_ENCRYPTION_KEY || "unicura-dev-only-change-this";
const LOOKUP_SECRET = process.env.UNICURA_LOOKUP_SECRET || "unicura-lookup-dev-only-change-this";
const ENCRYPTION_KEY = crypto.createHash("sha256").update(ENCRYPTION_SECRET).digest();

const doctors = [
  ["Dr. Vikas Chopra", "Cardiologist", "vikas.chopra@unicura.com", "9876500001", "UNICURA-CARD-001", "1200"],
  ["Dr. Ajay Aggarwal", "Cardiologist", "ajay.aggarwal@unicura.com", "9876500002", "UNICURA-CARD-002", "1100"],
  ["Dr. Soni Gupta", "Dermatologist", "soni.gupta@unicura.com", "9876500003", "UNICURA-DERM-001", "1000"],
  ["Dr. Jayant Jaswal", "ENT Specialist", "jayant.jaswal@unicura.com", "9876500004", "UNICURA-ENT-001", "900"]
];

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();

  try {
    const db = client.db(MONGODB_DB_NAME);
    const collection = db.collection("doctors");

    for (const [name, specialization, email, phone, licenseNumber, fee] of doctors) {
      const emailHash = hashForLookup(email);
      const existing = await collection.findOne({ emailHash });
      if (existing) {
        continue;
      }

      const passwordData = hashPassword("Doctor123!");
      await collection.insertOne({
        id: crypto.randomUUID(),
        name,
        specialization,
        email,
        emailHash,
        passwordHash: passwordData.hash,
        passwordSalt: passwordData.salt,
        phoneEncrypted: encryptValue(phone),
        licenseNumberEncrypted: encryptValue(licenseNumber),
        consultationFeeEncrypted: encryptValue(fee),
        createdAt: new Date().toISOString()
      });
    }

    console.log("Doctor seed completed.");
  } finally {
    await client.close();
  }
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}

function encryptValue(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(String(value), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    iv: iv.toString("hex"),
    tag: tag.toString("hex"),
    value: encrypted.toString("hex")
  };
}

function hashForLookup(value) {
  return crypto.createHmac("sha256", LOOKUP_SECRET).update(String(value)).digest("hex");
}

main().catch((error) => {
  console.error("Doctor seeding failed:", error);
  process.exit(1);
});
