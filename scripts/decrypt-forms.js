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
    const subscriptions = db.collection("subscriptions");
    const contacts = db.collection("contacts");
    const feedback = db.collection("feedback");

    let updatedSubscriptions = 0;
    let updatedContacts = 0;
    let updatedFeedback = 0;

    const subscriptionDocs = await subscriptions.find({
      $or: [
        { emailEncrypted: { $exists: true } },
        { sourcePageEncrypted: { $exists: true } }
      ]
    }).toArray();

    for (const doc of subscriptionDocs) {
      const update = { $set: {}, $unset: {} };

      if (doc.emailEncrypted && !doc.email) {
        update.$set.email = decryptValue(doc.emailEncrypted);
        update.$unset.emailEncrypted = "";
      }

      if (doc.sourcePageEncrypted && !doc.sourcePage) {
        update.$set.sourcePage = decryptValue(doc.sourcePageEncrypted);
        update.$unset.sourcePageEncrypted = "";
      }

      if (Object.keys(update.$set).length || Object.keys(update.$unset).length) {
        await subscriptions.updateOne({ _id: doc._id }, update);
        updatedSubscriptions += 1;
      }
    }

    const contactDocs = await contacts.find({ encryptedPayload: { $exists: true } }).toArray();
    for (const doc of contactDocs) {
      const decrypted = JSON.parse(decryptValue(doc.encryptedPayload));

      await contacts.updateOne(
        { _id: doc._id },
        {
          $set: {
            name: decrypted.name || "",
            email: decrypted.email || "",
            subject: decrypted.subject || "",
            message: decrypted.message || ""
          },
          $unset: {
            encryptedPayload: ""
          }
        }
      );
      updatedContacts += 1;
    }

    const feedbackDocs = await feedback.find({ encryptedPayload: { $exists: true } }).toArray();
    for (const doc of feedbackDocs) {
      const decrypted = JSON.parse(decryptValue(doc.encryptedPayload));

      await feedback.updateOne(
        { _id: doc._id },
        {
          $set: {
            name: decrypted.name || "",
            email: decrypted.email || "",
            rating: Number(decrypted.rating) || 0,
            feedback: decrypted.feedback || ""
          },
          $unset: {
            encryptedPayload: ""
          }
        }
      );
      updatedFeedback += 1;
    }

    console.log(`Updated subscriptions: ${updatedSubscriptions}`);
    console.log(`Updated contacts: ${updatedContacts}`);
    console.log(`Updated feedback: ${updatedFeedback}`);
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
  console.error("Form decryption migration failed:", error);
  process.exit(1);
});
