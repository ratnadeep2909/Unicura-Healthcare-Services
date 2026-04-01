const crypto = require("crypto");
const { MongoClient } = require("mongodb");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || "unicura";
const ENCRYPTION_SECRET = process.env.UNICURA_ENCRYPTION_KEY || "unicura-dev-only-change-this";
const ENCRYPTION_KEY = crypto.createHash("sha256").update(ENCRYPTION_SECRET).digest();

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();

  try {
    const db = client.db(MONGODB_DB_NAME);
    const appointments = db.collection("appointments");
    const docs = await appointments.find({ encryptedPayload: { $exists: true } }).toArray();

    let updated = 0;

    for (const doc of docs) {
      if (!doc.encryptedPayload) {
        continue;
      }

      const decrypted = JSON.parse(decryptValue(doc.encryptedPayload));

      await appointments.updateOne(
        { _id: doc._id },
        {
          $set: {
            fullName: decrypted.fullName || "",
            dob: decrypted.dob || "",
            email: decrypted.email || "",
            phone: decrypted.phone || "",
            doctor: decrypted.doctor || "",
            appointmentDate: decrypted.appointmentDate || "",
            timeSlot: decrypted.timeSlot || "",
            reason: decrypted.reason || "",
            existingPatient: Boolean(decrypted.existingPatient),
            patientId: decrypted.patientId || ""
          },
          $unset: {
            encryptedPayload: ""
          }
        }
      );

      updated += 1;
    }

    console.log(`Updated ${updated} appointment document(s).`);
  } finally {
    await client.close();
  }
}

function decryptValue(payload) {
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    ENCRYPTION_KEY,
    Buffer.from(payload.iv, "hex")
  );
  decipher.setAuthTag(Buffer.from(payload.tag, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.value, "hex")),
    decipher.final()
  ]);
  return decrypted.toString("utf8");
}

main().catch((error) => {
  console.error("Appointment decryption migration failed:", error);
  process.exit(1);
});
