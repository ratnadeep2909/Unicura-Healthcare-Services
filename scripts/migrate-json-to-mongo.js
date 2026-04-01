const fs = require("fs");
const path = require("path");
const { MongoClient } = require("mongodb");

const DATA_DIR = path.join(__dirname, "..", "data");
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || "unicura";

const fileToCollection = {
  "appointments.json": "appointments",
  "blood-tests.json": "bloodTests",
  "checkups.json": "checkupBookings",
  "contacts.json": "contacts",
  "emergencies.json": "emergencyRequests",
  "feedback.json": "feedback",
  "subscriptions.json": "subscriptions",
  "users.json": "users"
};

async function main() {
  if (!fs.existsSync(DATA_DIR)) {
    console.log("No data directory found. Nothing to migrate.");
    return;
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(MONGODB_DB_NAME);

  try {
    for (const [fileName, collectionName] of Object.entries(fileToCollection)) {
      const filePath = path.join(DATA_DIR, fileName);
      if (!fs.existsSync(filePath)) {
        continue;
      }

      const raw = fs.readFileSync(filePath, "utf8").trim();
      if (!raw) {
        continue;
      }

      const documents = JSON.parse(raw);
      if (!Array.isArray(documents) || documents.length === 0) {
        continue;
      }

      const collection = db.collection(collectionName);
      let inserted = 0;

      for (const document of documents) {
        const existing = document.id
          ? await collection.findOne({ id: document.id })
          : null;

        if (existing) {
          continue;
        }

        await collection.insertOne(document);
        inserted += 1;
      }

      console.log(`${collectionName}: inserted ${inserted} document(s)`);
    }
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
