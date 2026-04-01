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
    const users = db.collection("users");
    const docs = await users.find({
      $or: [
        { nameEncrypted: { $exists: true } },
        { emailEncrypted: { $exists: true } }
      ]
    }).toArray();

    let updated = 0;

    for (const doc of docs) {
      const update = { $set: {}, $unset: {} };

      if (doc.nameEncrypted && !doc.name) {
        update.$set.name = decryptValue(doc.nameEncrypted);
        update.$unset.nameEncrypted = "";
      }

      if (doc.emailEncrypted && !doc.email) {
        update.$set.email = decryptValue(doc.emailEncrypted);
        update.$unset.emailEncrypted = "";
      }

      if (Object.keys(update.$set).length || Object.keys(update.$unset).length) {
        await users.updateOne({ _id: doc._id }, update);
        updated += 1;
      }
    }

    console.log(`Updated ${updated} user document(s).`);
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
  console.error("User decryption migration failed:", error);
  process.exit(1);
});
