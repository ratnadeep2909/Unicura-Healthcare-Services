const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { MongoClient } = require("mongodb");
const nodemailer = require("nodemailer");

const PORT = Number(process.env.PORT) || 3000;
const BASE_DIR = __dirname;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || "unicura";

const ENCRYPTION_SECRET = process.env.UNICURA_ENCRYPTION_KEY || "unicura-dev-only-change-this";
const TOKEN_SECRET = process.env.UNICURA_TOKEN_SECRET || "unicura-token-dev-only-change-this";
const LOOKUP_SECRET = process.env.UNICURA_LOOKUP_SECRET || "unicura-lookup-dev-only-change-this";
const ENCRYPTION_KEY = crypto.createHash("sha256").update(ENCRYPTION_SECRET).digest();
const mongoClient = new MongoClient(MONGODB_URI);
let database;
const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;
const SMTP_SECURE = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER || "no-reply@unicura.local";
const APP_BASE_URL = process.env.APP_BASE_URL || `http://localhost:${PORT}`;
const doctorTransporter = SMTP_HOST && SMTP_USER && SMTP_PASS
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
      }
    })
  : null;

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".eot": "application/vnd.ms-fontobject",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".less": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".mp4": "video/mp4",
  ".png": "image/png",
  ".scss": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".yml": "text/yaml; charset=utf-8"
};

const server = http.createServer(async (req, res) => {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

    if (url.pathname === "/api/health" && req.method === "GET") {
      return sendJson(res, 200, {
        message: "UniCura backend is running",
        date: new Date().toISOString()
      });
    }

    if (url.pathname === "/api/auth/register" && req.method === "POST") {
      const body = await readJsonBody(req);
      return handleRegister(res, body);
    }

    if (url.pathname === "/api/auth/login" && req.method === "POST") {
      const body = await readJsonBody(req);
      return handleLogin(res, body);
    }

    if (url.pathname === "/api/auth/reset-password" && req.method === "POST") {
      const body = await readJsonBody(req);
      return handleResetPassword(res, body);
    }

    if (url.pathname === "/api/appointments" && req.method === "POST") {
      const body = await readJsonBody(req);
      return handleAppointment(res, body);
    }

    if (url.pathname === "/api/appointments" && req.method === "GET") {
      const email = normalizeEmail(url.searchParams.get("email"));
      return handleAppointmentLookup(res, email);
    }

    if (url.pathname === "/api/doctors" && req.method === "GET") {
      return handleDoctorsLookup(res);
    }

    if (url.pathname === "/api/doctors/login" && req.method === "POST") {
      const body = await readJsonBody(req);
      return handleDoctorLogin(res, body);
    }

    if (url.pathname === "/api/doctors/appointments" && req.method === "GET") {
      const email = normalizeEmail(url.searchParams.get("email"));
      return handleDoctorAppointmentsLookup(res, email);
    }

    if (url.pathname === "/api/pharmacies" && req.method === "GET") {
      const lat = Number(url.searchParams.get("lat"));
      const lng = Number(url.searchParams.get("lng"));
      return handlePharmacyLookup(res, lat, lng);
    }

    if (url.pathname === "/api/hospitals" && req.method === "GET") {
      const lat = Number(url.searchParams.get("lat"));
      const lng = Number(url.searchParams.get("lng"));
      return handleHospitalLookup(res, lat, lng);
    }

    if (url.pathname === "/api/test-labs" && req.method === "GET") {
      const lat = Number(url.searchParams.get("lat"));
      const lng = Number(url.searchParams.get("lng"));
      return handleTestLabLookup(res, lat, lng);
    }

    if (url.pathname === "/api/test-labs/login" && req.method === "POST") {
      const body = await readJsonBody(req);
      return handleTestLabLogin(res, body);
    }

    if (url.pathname === "/api/test-labs/dashboard" && req.method === "GET") {
      const email = normalizeEmail(url.searchParams.get("email"));
      return handleTestLabDashboardLookup(res, email);
    }

    if (url.pathname === "/api/test-labs/update" && req.method === "POST") {
      const body = await readJsonBody(req);
      return handleTestLabUpdate(res, body);
    }

    if (url.pathname === "/api/test-lab-bookings" && req.method === "POST") {
      const body = await readJsonBody(req);
      return handleTestLabBooking(res, body);
    }

    if (url.pathname === "/api/test-lab-bookings" && req.method === "GET") {
      const mobileNumber = normalizeText(url.searchParams.get("mobileNumber"));
      return handleTestLabBookingsLookup(res, mobileNumber);
    }

    if (url.pathname === "/api/hospitals/login" && req.method === "POST") {
      const body = await readJsonBody(req);
      return handleHospitalLogin(res, body);
    }

    if (url.pathname === "/api/hospitals/dashboard" && req.method === "GET") {
      const email = normalizeEmail(url.searchParams.get("email"));
      return handleHospitalDashboardLookup(res, email);
    }

    if (url.pathname === "/api/hospitals/beds" && req.method === "POST") {
      const body = await readJsonBody(req);
      return handleHospitalBedsUpdate(res, body);
    }

    if (url.pathname === "/api/pharmacies/login" && req.method === "POST") {
      const body = await readJsonBody(req);
      return handlePharmacyLogin(res, body);
    }

    if (url.pathname === "/api/pharmacies/orders" && req.method === "GET") {
      const email = normalizeEmail(url.searchParams.get("email"));
      return handlePharmacyOrdersByEmail(res, email);
    }

    if (url.pathname === "/api/checkup-bookings" && req.method === "POST") {
      const body = await readJsonBody(req);
      return handleCheckup(res, body);
    }

    if (url.pathname === "/api/medicine-info" && req.method === "GET") {
      const medicineName = (url.searchParams.get("name") || "").trim();
      return handleMedicineInfo(res, medicineName);
    }

    if (url.pathname === "/api/subscriptions" && req.method === "POST") {
      const body = await readJsonBody(req);
      return handleSubscription(res, body);
    }

    if (url.pathname === "/api/contact" && req.method === "POST") {
      const body = await readJsonBody(req);
      return handleContact(res, body);
    }

    if (url.pathname === "/api/feedback" && req.method === "POST") {
      const body = await readJsonBody(req);
      return handleFeedback(res, body);
    }

    if (url.pathname === "/api/emergency-requests" && req.method === "POST") {
      const body = await readJsonBody(req);
      return handleEmergencyRequest(res, body);
    }

    if (url.pathname === "/api/blood-test-analysis" && req.method === "POST") {
      const body = await readJsonBody(req);
      return handleBloodTestAnalysis(res, body);
    }

    if (url.pathname === "/api/pharmacy-orders" && req.method === "POST") {
      const body = await readJsonBody(req);
      return handlePharmacyOrder(res, body);
    }

    if (url.pathname === "/api/pharmacy-orders" && req.method === "GET") {
      const mobileNumber = normalizeText(url.searchParams.get("mobileNumber"));
      return handlePharmacyOrdersLookup(res, mobileNumber);
    }

    if (url.pathname === "/api/pharmacy-orders/status" && req.method === "POST") {
      const body = await readJsonBody(req);
      return handlePharmacyOrderStatusUpdate(res, body);
    }

    if (url.pathname === "/api/chat/messages" && req.method === "GET") {
      const appointmentId = normalizeText(url.searchParams.get("appointmentId"));
      return handleChatLookup(res, appointmentId);
    }

    if (url.pathname === "/api/chat/messages" && req.method === "POST") {
      const body = await readJsonBody(req);
      return handleChatMessage(res, body);
    }

    return serveStaticFile(req, res, url.pathname);
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, {
      message: "Something went wrong on the server."
    });
  }
});

startServer().catch((error) => {
  console.error("Failed to start UniCura server:", error);
  process.exit(1);
});

async function startServer() {
  await mongoClient.connect();
  database = mongoClient.db(MONGODB_DB_NAME);

  await Promise.all([
    ensureUniqueEmailIndex("users"),
    ensureUniqueEmailIndex("subscriptions"),
    ensureUniqueEmailIndex("doctors"),
    ensureUniqueEmailIndex("pharmacies"),
    ensureUniqueEmailIndex("hospitals"),
    ensureUniqueEmailIndex("testLabs")
  ]);

  await seedDoctorsIfNeeded();
  await seedPharmaciesIfNeeded();
  await seedHospitalsIfNeeded();
  await seedTestLabsIfNeeded();
  await ensurePharmacyAccessIfNeeded();
  await ensureHospitalAccessIfNeeded();
  await ensureTestLabAccessIfNeeded();

  server.listen(PORT, () => {
    console.log(`UniCura server running at http://localhost:${PORT}`);
    console.log(`MongoDB connected: ${MONGODB_URI} / ${MONGODB_DB_NAME}`);
  });
}

async function ensureUniqueEmailIndex(collectionName) {
  try {
    await getCollection(collectionName).createIndex(
      { emailHash: 1 },
      { unique: true, sparse: true }
    );
  } catch (error) {
    if (error && error.code === 86) {
      return;
    }
    throw error;
  }
}

async function seedDoctorsIfNeeded() {
  const doctors = getCollection("doctors");
  const count = await doctors.countDocuments();
  if (count > 0) {
    return;
  }

  const defaults = [
    {
      name: "Dr. Vikas Chopra",
      specialization: "Cardiologist",
      email: "vikas.chopra@unicura.com",
      password: "Doctor123!",
      phone: "9876500001",
      licenseNumber: "UNICURA-CARD-001",
      consultationFee: "1200"
    },
    {
      name: "Dr. Ajay Aggarwal",
      specialization: "Cardiologist",
      email: "ajay.aggarwal@unicura.com",
      password: "Doctor123!",
      phone: "9876500002",
      licenseNumber: "UNICURA-CARD-002",
      consultationFee: "1100"
    },
    {
      name: "Dr. Soni Gupta",
      specialization: "Dermatologist",
      email: "soni.gupta@unicura.com",
      password: "Doctor123!",
      phone: "9876500003",
      licenseNumber: "UNICURA-DERM-001",
      consultationFee: "1000"
    },
    {
      name: "Dr. Jayant Jaswal",
      specialization: "ENT Specialist",
      email: "jayant.jaswal@unicura.com",
      password: "Doctor123!",
      phone: "9876500004",
      licenseNumber: "UNICURA-ENT-001",
      consultationFee: "900"
    }
  ];

  const doctorDocs = defaults.map((doctor) => {
    const passwordData = hashPassword(doctor.password);
    return {
      id: crypto.randomUUID(),
      name: doctor.name,
      specialization: doctor.specialization,
      email: doctor.email,
      emailHash: hashForLookup(doctor.email),
      passwordHash: passwordData.hash,
      passwordSalt: passwordData.salt,
      phoneEncrypted: encryptValue(doctor.phone),
      licenseNumberEncrypted: encryptValue(doctor.licenseNumber),
      consultationFeeEncrypted: encryptValue(doctor.consultationFee),
      createdAt: new Date().toISOString()
    };
  });

  await doctors.insertMany(doctorDocs);
}

async function seedPharmaciesIfNeeded() {
  const pharmacies = getCollection("pharmacies");
  const count = await pharmacies.countDocuments();
  if (count > 0) {
    return;
  }

  await pharmacies.insertMany([
    {
      id: crypto.randomUUID(),
      name: "CarePlus Medical",
      email: "careplus@unicura.com",
      phone: "9821001001",
      address: "Andheri East, Mumbai",
      city: "Mumbai",
      latitude: 19.1136,
      longitude: 72.8697,
      openHours: "8:00 AM - 11:00 PM",
      deliveryAvailable: true,
      createdAt: new Date().toISOString()
    },
    {
      id: crypto.randomUUID(),
      name: "HealthHub Pharmacy",
      email: "healthhub@unicura.com",
      phone: "9821001002",
      address: "Powai, Mumbai",
      city: "Mumbai",
      latitude: 19.1197,
      longitude: 72.9050,
      openHours: "24 Hours",
      deliveryAvailable: true,
      createdAt: new Date().toISOString()
    },
    {
      id: crypto.randomUUID(),
      name: "Apollo Med Corner",
      email: "apollo.corner@unicura.com",
      phone: "9821001003",
      address: "T Nagar, Chennai",
      city: "Chennai",
      latitude: 13.0418,
      longitude: 80.2337,
      openHours: "7:00 AM - 10:00 PM",
      deliveryAvailable: true,
      createdAt: new Date().toISOString()
    },
    {
      id: crypto.randomUUID(),
      name: "Metro Wellness Pharmacy",
      email: "metro.wellness@unicura.com",
      phone: "9821001004",
      address: "Connaught Place, Delhi",
      city: "Delhi",
      latitude: 28.6315,
      longitude: 77.2167,
      openHours: "9:00 AM - 11:30 PM",
      deliveryAvailable: true,
      createdAt: new Date().toISOString()
    },
    {
      id: crypto.randomUUID(),
      name: "Lakeview Medicals",
      email: "lakeview@unicura.com",
      phone: "9821001005",
      address: "Salt Lake, Kolkata",
      city: "Kolkata",
      latitude: 22.5726,
      longitude: 88.3639,
      openHours: "8:00 AM - 10:00 PM",
      deliveryAvailable: true,
      createdAt: new Date().toISOString()
    },
    {
      id: crypto.randomUUID(),
      name: "GreenCross Pharmacy",
      email: "greencross@unicura.com",
      phone: "9821001006",
      address: "Banjara Hills, Hyderabad",
      city: "Hyderabad",
      latitude: 17.4126,
      longitude: 78.4482,
      openHours: "24 Hours",
      deliveryAvailable: true,
      createdAt: new Date().toISOString()
    }
  ]);
}

async function seedHospitalsIfNeeded() {
  const hospitals = getCollection("hospitals");
  const count = await hospitals.countDocuments();
  if (count > 0) {
    return;
  }

  await hospitals.insertMany([
    {
      id: crypto.randomUUID(),
      name: "CityCare Multispeciality Hospital",
      email: "citycare.hospital@unicura.com",
      address: "Bandra West, Mumbai",
      city: "Mumbai",
      phone: "022-41001001",
      emergencyAvailable: true,
      totalBeds: 180,
      availableBeds: 26,
      availableIcuBeds: 5,
      availableOxygenBeds: 11,
      latitude: 19.0596,
      longitude: 72.8295,
      createdAt: new Date().toISOString()
    },
    {
      id: crypto.randomUUID(),
      name: "Sunrise Emergency Hospital",
      email: "sunrise.emergency@unicura.com",
      address: "Andheri West, Mumbai",
      city: "Mumbai",
      phone: "022-41001002",
      emergencyAvailable: true,
      totalBeds: 220,
      availableBeds: 34,
      availableIcuBeds: 8,
      availableOxygenBeds: 14,
      latitude: 19.1364,
      longitude: 72.8276,
      createdAt: new Date().toISOString()
    },
    {
      id: crypto.randomUUID(),
      name: "Apollo Community Hospital",
      email: "apollo.community@unicura.com",
      address: "T Nagar, Chennai",
      city: "Chennai",
      phone: "044-41001003",
      emergencyAvailable: true,
      totalBeds: 200,
      availableBeds: 21,
      availableIcuBeds: 6,
      availableOxygenBeds: 9,
      latitude: 13.0418,
      longitude: 80.2337,
      createdAt: new Date().toISOString()
    },
    {
      id: crypto.randomUUID(),
      name: "Metro Heart & Trauma Center",
      email: "metro.trauma@unicura.com",
      address: "Connaught Place, Delhi",
      city: "Delhi",
      phone: "011-41001004",
      emergencyAvailable: true,
      totalBeds: 260,
      availableBeds: 48,
      availableIcuBeds: 10,
      availableOxygenBeds: 19,
      latitude: 28.6315,
      longitude: 77.2167,
      createdAt: new Date().toISOString()
    },
    {
      id: crypto.randomUUID(),
      name: "Lakeview General Hospital",
      email: "lakeview.general@unicura.com",
      address: "Salt Lake, Kolkata",
      city: "Kolkata",
      phone: "033-41001005",
      emergencyAvailable: true,
      totalBeds: 190,
      availableBeds: 17,
      availableIcuBeds: 4,
      availableOxygenBeds: 7,
      latitude: 22.5726,
      longitude: 88.3639,
      createdAt: new Date().toISOString()
    },
    {
      id: crypto.randomUUID(),
      name: "Greenline Care Hospital",
      email: "greenline.care@unicura.com",
      address: "Banjara Hills, Hyderabad",
      city: "Hyderabad",
      phone: "040-41001006",
      emergencyAvailable: true,
      totalBeds: 210,
      availableBeds: 29,
      availableIcuBeds: 7,
      availableOxygenBeds: 13,
      latitude: 17.4126,
      longitude: 78.4482,
      createdAt: new Date().toISOString()
    }
  ]);
}

async function seedTestLabsIfNeeded() {
  const testLabs = getCollection("testLabs");
  const count = await testLabs.countDocuments();
  if (count > 0) {
    return;
  }

  await testLabs.insertMany([
    {
      id: crypto.randomUUID(),
      name: "Precision Diagnostics Lab",
      email: "precision.diagnostics.lab@unicura.com",
      address: "Powai, Mumbai",
      city: "Mumbai",
      phone: "022-42001001",
      homeCollection: true,
      openHours: "6:30 AM - 9:30 PM",
      testsAvailable: ["Blood Test", "Urine Test", "Thyroid Panel", "Diabetes Profile"],
      latitude: 19.1197,
      longitude: 72.9050,
      createdAt: new Date().toISOString()
    },
    {
      id: crypto.randomUUID(),
      name: "CarePath Labs",
      email: "carepath.labs@unicura.com",
      address: "Andheri East, Mumbai",
      city: "Mumbai",
      phone: "022-42001002",
      homeCollection: true,
      openHours: "24 Hours",
      testsAvailable: ["CBC", "Vitamin Test", "Liver Function Test", "Lipid Profile"],
      latitude: 19.1136,
      longitude: 72.8697,
      createdAt: new Date().toISOString()
    },
    {
      id: crypto.randomUUID(),
      name: "Apollo Lab Point",
      email: "apollo.lab.point@unicura.com",
      address: "T Nagar, Chennai",
      city: "Chennai",
      phone: "044-42001003",
      homeCollection: true,
      openHours: "7:00 AM - 10:00 PM",
      testsAvailable: ["Blood Test", "Allergy Test", "Thyroid Panel"],
      latitude: 13.0418,
      longitude: 80.2337,
      createdAt: new Date().toISOString()
    },
    {
      id: crypto.randomUUID(),
      name: "Metro Bio Lab",
      email: "metro.bio.lab@unicura.com",
      address: "Connaught Place, Delhi",
      city: "Delhi",
      phone: "011-42001004",
      homeCollection: false,
      openHours: "8:00 AM - 11:00 PM",
      testsAvailable: ["Blood Test", "Microbiology", "Pathology"],
      latitude: 28.6315,
      longitude: 77.2167,
      createdAt: new Date().toISOString()
    },
    {
      id: crypto.randomUUID(),
      name: "Lakeview Diagnostics",
      email: "lakeview.diagnostics@unicura.com",
      address: "Salt Lake, Kolkata",
      city: "Kolkata",
      phone: "033-42001005",
      homeCollection: true,
      openHours: "7:00 AM - 9:00 PM",
      testsAvailable: ["Blood Test", "Fever Panel", "Urine Test"],
      latitude: 22.5726,
      longitude: 88.3639,
      createdAt: new Date().toISOString()
    },
    {
      id: crypto.randomUUID(),
      name: "Greenline Test Lab",
      email: "greenline.test.lab@unicura.com",
      address: "Banjara Hills, Hyderabad",
      city: "Hyderabad",
      phone: "040-42001006",
      homeCollection: true,
      openHours: "24 Hours",
      testsAvailable: ["Blood Test", "Biochemistry", "Allergy Test"],
      latitude: 17.4126,
      longitude: 78.4482,
      createdAt: new Date().toISOString()
    }
  ]);
}

async function ensureTestLabAccessIfNeeded() {
  const testLabs = getCollection("testLabs");
  const rows = await testLabs.find({}).toArray();

  for (const lab of rows) {
    if (lab.passwordHash && lab.passwordSalt && lab.emailHash && lab.email) {
      continue;
    }

    const fallbackEmail = lab.email || `${String(lab.name || "lab").toLowerCase().replace(/[^a-z0-9]+/g, ".")}@unicura.com`;
    const passwordData = hashPassword("Lab123!");
    await testLabs.updateOne(
      { _id: lab._id },
      {
        $set: {
          id: lab.id || crypto.randomUUID(),
          email: fallbackEmail,
          emailHash: hashForLookup(fallbackEmail),
          passwordHash: passwordData.hash,
          passwordSalt: passwordData.salt
        }
      }
    );
  }
}

async function ensureHospitalAccessIfNeeded() {
  const hospitals = getCollection("hospitals");
  const rows = await hospitals.find({}).toArray();

  for (const hospital of rows) {
    if (hospital.passwordHash && hospital.passwordSalt && hospital.emailHash && hospital.email) {
      continue;
    }

    const fallbackEmail = hospital.email || `${String(hospital.name || "hospital").toLowerCase().replace(/[^a-z0-9]+/g, ".")}@unicura.com`;
    const passwordData = hashPassword("Hospital123!");
    await hospitals.updateOne(
      { _id: hospital._id },
      {
        $set: {
          id: hospital.id || crypto.randomUUID(),
          email: fallbackEmail,
          emailHash: hashForLookup(fallbackEmail),
          passwordHash: passwordData.hash,
          passwordSalt: passwordData.salt
        }
      }
    );
  }
}

async function ensurePharmacyAccessIfNeeded() {
  const pharmacies = getCollection("pharmacies");
  const rows = await pharmacies.find({}).toArray();

  for (const pharmacy of rows) {
    if (pharmacy.passwordHash && pharmacy.passwordSalt && pharmacy.emailHash) {
      continue;
    }

    const passwordData = hashPassword("Pharmacy123!");
    await pharmacies.updateOne(
      { _id: pharmacy._id },
      {
        $set: {
          id: pharmacy.id || crypto.randomUUID(),
          emailHash: hashForLookup(pharmacy.email || ""),
          passwordHash: passwordData.hash,
          passwordSalt: passwordData.salt
        }
      }
    );
  }
}

async function handleRegister(res, body) {
  const name = normalizeText(body.name);
  const email = normalizeEmail(body.email);
  const password = String(body.password || "");

  if (!name || !email || !password) {
    return sendJson(res, 400, { message: "Name, email, and password are required." });
  }

  if (password.length < 6) {
    return sendJson(res, 400, { message: "Password must be at least 6 characters long." });
  }

  const emailHash = hashForLookup(email);
  const existingUser = await getCollection("users").findOne({ emailHash });

  if (existingUser) {
    return sendJson(res, 409, { message: "An account with this email already exists." });
  }

  const passwordData = hashPassword(password);
  const createdAt = new Date().toISOString();
  const user = {
    id: crypto.randomUUID(),
    emailHash,
    name,
    email,
    passwordHash: passwordData.hash,
    passwordSalt: passwordData.salt,
    createdAt
  };

  await getCollection("users").insertOne(user);

  const publicUser = {
    id: user.id,
    name,
    email,
    createdAt
  };

  return sendJson(res, 201, {
    message: "Account created successfully.",
    token: createToken(publicUser),
    user: publicUser
  });
}

async function handleLogin(res, body) {
  const email = normalizeEmail(body.email);
  const password = String(body.password || "");

  if (!email || !password) {
    return sendJson(res, 400, { message: "Email and password are required." });
  }

  const user = await getCollection("users").findOne({
    emailHash: hashForLookup(email)
  });

  if (!user || !verifyPassword(password, user.passwordSalt, user.passwordHash)) {
    return sendJson(res, 401, { message: "Invalid email or password." });
  }

  const publicUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt
  };

  return sendJson(res, 200, {
    message: "Login successful.",
    token: createToken(publicUser),
    user: publicUser
  });
}

async function handleResetPassword(res, body) {
  const email = normalizeEmail(body.email);
  const newPassword = String(body.newPassword || "");

  if (!email || !newPassword) {
    return sendJson(res, 400, { message: "Email and new password are required." });
  }

  if (newPassword.length < 6) {
    return sendJson(res, 400, { message: "New password must be at least 6 characters long." });
  }

  const emailHash = hashForLookup(email);
  const existingUser = await getCollection("users").findOne({ emailHash });

  if (!existingUser) {
    return sendJson(res, 404, { message: "Account not found." });
  }

  const passwordData = hashPassword(newPassword);
  await getCollection("users").updateOne(
    { emailHash },
    {
      $set: {
        passwordHash: passwordData.hash,
        passwordSalt: passwordData.salt
      }
    }
  );

  return sendJson(res, 200, { message: "Password updated successfully." });
}

async function handleAppointment(res, body) {
  const appointment = {
    fullName: normalizeText(body.fullName),
    dob: normalizeText(body.dob),
    email: normalizeEmail(body.email),
    phone: normalizeText(body.phone),
    doctor: normalizeText(body.doctor),
    appointmentDate: normalizeText(body.appointmentDate),
    timeSlot: normalizeText(body.timeSlot),
    reason: normalizeText(body.reason),
    existingPatient: Boolean(body.existingPatient),
    patientId: normalizeText(body.patientId)
  };

  if (!appointment.fullName || !appointment.email || !appointment.phone || !appointment.doctor || !appointment.appointmentDate || !appointment.timeSlot || !appointment.reason) {
    return sendJson(res, 400, { message: "Please fill in all appointment details." });
  }

  const doctorRecord = await getCollection("doctors").findOne({
    name: appointment.doctor
  });
  if (!doctorRecord) {
    return sendJson(res, 404, { message: "Selected doctor was not found." });
  }

  const appointmentId = crypto.randomUUID();
  const consultationRoom = `unicura-${appointmentId}`;
  const consultationLink = `https://meet.jit.si/${consultationRoom}`;
  const chatLink = `${APP_BASE_URL}/consultation.html?appointmentId=${encodeURIComponent(appointmentId)}&role=patient&name=${encodeURIComponent(appointment.fullName)}`;

  await getCollection("appointments").insertOne({
    id: appointmentId,
    fullName: appointment.fullName,
    dob: appointment.dob,
    email: appointment.email,
    phone: appointment.phone,
    doctor: appointment.doctor,
    doctorEmail: doctorRecord.email,
    appointmentDate: appointment.appointmentDate,
    timeSlot: appointment.timeSlot,
    reason: appointment.reason,
    existingPatient: appointment.existingPatient,
    patientId: appointment.patientId,
    consultationRoom,
    consultationLink,
    chatLink,
    createdAt: new Date().toISOString()
  });

  await sendDoctorAppointmentEmail({
    doctorEmail: doctorRecord.email,
    doctorName: doctorRecord.name,
    appointmentId,
    patientName: appointment.fullName,
    patientEmail: appointment.email,
    patientPhone: appointment.phone,
    appointmentDate: appointment.appointmentDate,
    timeSlot: appointment.timeSlot,
    reason: appointment.reason,
    consultationLink,
    chatLink: `${APP_BASE_URL}/consultation.html?appointmentId=${encodeURIComponent(appointmentId)}&role=doctor&name=${encodeURIComponent(doctorRecord.name)}`
  });

  return sendJson(res, 201, {
    message: "Appointment booked successfully.",
    appointment: {
      id: appointmentId,
      fullName: appointment.fullName,
      doctor: appointment.doctor,
      appointmentDate: appointment.appointmentDate,
      timeSlot: appointment.timeSlot,
      consultationLink,
      chatLink
    }
  });
}

async function handleAppointmentLookup(res, email) {
  if (!email) {
    return sendJson(res, 400, { message: "Email is required." });
  }

  const appointments = await getCollection("appointments")
    .find({ email })
    .sort({ createdAt: -1 })
    .toArray();

  return sendJson(res, 200, {
    appointments: appointments.map((appointment) => ({
      id: appointment.id,
      fullName: appointment.fullName,
      dob: appointment.dob,
      email: appointment.email,
      phone: appointment.phone,
      doctor: appointment.doctor,
      doctorEmail: appointment.doctorEmail || "",
      appointmentDate: appointment.appointmentDate,
      timeSlot: appointment.timeSlot,
      reason: appointment.reason,
      existingPatient: Boolean(appointment.existingPatient),
      patientId: appointment.patientId || "",
      consultationLink: appointment.consultationLink || "",
      chatLink: appointment.chatLink || "",
      createdAt: appointment.createdAt
    }))
  });
}

async function handleDoctorsLookup(res) {
  const doctors = await getCollection("doctors")
    .find({}, { projection: { _id: 0, id: 1, name: 1, specialization: 1, email: 1 } })
    .sort({ name: 1 })
    .toArray();

  return sendJson(res, 200, { doctors });
}

async function handlePharmacyLookup(res, lat, lng) {
  const pharmacies = await getCollection("pharmacies").find({}, { projection: { _id: 0 } }).toArray();

  const withDistance = pharmacies.map((pharmacy) => ({
    ...pharmacy,
    distanceKm: Number.isFinite(lat) && Number.isFinite(lng)
      ? Number(haversineKm(lat, lng, pharmacy.latitude, pharmacy.longitude).toFixed(2))
      : null
  }));

  withDistance.sort((a, b) => {
    if (a.distanceKm == null && b.distanceKm == null) return 0;
    if (a.distanceKm == null) return 1;
    if (b.distanceKm == null) return -1;
    return a.distanceKm - b.distanceKm;
  });

  return sendJson(res, 200, { pharmacies: withDistance.slice(0, 6) });
}

async function handleHospitalLookup(res, lat, lng) {
  const hospitals = await getCollection("hospitals").find({}, { projection: { _id: 0 } }).toArray();

  const withDistance = hospitals.map((hospital) => ({
    ...hospital,
    distanceKm: Number.isFinite(lat) && Number.isFinite(lng)
      ? Number(haversineKm(lat, lng, hospital.latitude, hospital.longitude).toFixed(2))
      : null
  }));

  withDistance.sort((a, b) => {
    if (a.distanceKm == null && b.distanceKm == null) return 0;
    if (a.distanceKm == null) return 1;
    if (b.distanceKm == null) return -1;
    return a.distanceKm - b.distanceKm;
  });

  return sendJson(res, 200, { hospitals: withDistance.slice(0, 6) });
}

async function handleTestLabLookup(res, lat, lng) {
  const testLabs = await getCollection("testLabs").find({}, { projection: { _id: 0 } }).toArray();

  const withDistance = testLabs.map((lab) => ({
    ...lab,
    distanceKm: Number.isFinite(lat) && Number.isFinite(lng)
      ? Number(haversineKm(lat, lng, lab.latitude, lab.longitude).toFixed(2))
      : null
  }));

  withDistance.sort((a, b) => {
    if (a.distanceKm == null && b.distanceKm == null) return 0;
    if (a.distanceKm == null) return 1;
    if (b.distanceKm == null) return -1;
    return a.distanceKm - b.distanceKm;
  });

  return sendJson(res, 200, { testLabs: withDistance.slice(0, 6) });
}

async function handleTestLabLogin(res, body) {
  const email = normalizeEmail(body.email);
  const password = String(body.password || "");

  if (!email || !password) {
    return sendJson(res, 400, { message: "Email and password are required." });
  }

  const lab = await getCollection("testLabs").findOne({
    emailHash: hashForLookup(email)
  });

  if (!lab || !verifyPassword(password, lab.passwordSalt, lab.passwordHash)) {
    return sendJson(res, 401, { message: "Invalid lab email or password." });
  }

  const publicLab = {
    id: lab.id,
    name: lab.name,
    email: lab.email,
    address: lab.address,
    city: lab.city,
    phone: lab.phone,
    homeCollection: Boolean(lab.homeCollection),
    openHours: lab.openHours,
    testsAvailable: Array.isArray(lab.testsAvailable) ? lab.testsAvailable : []
  };

  return sendJson(res, 200, {
    message: "Lab login successful.",
    token: createToken({
      id: lab.id,
      name: lab.name,
      email: lab.email
    }),
    lab: publicLab
  });
}

async function handleTestLabDashboardLookup(res, email) {
  if (!email) {
    return sendJson(res, 400, { message: "Lab email is required." });
  }

  const lab = await getCollection("testLabs").findOne(
    { emailHash: hashForLookup(email) },
    { projection: { _id: 0, passwordHash: 0, passwordSalt: 0, emailHash: 0 } }
  );

  if (!lab) {
    return sendJson(res, 404, { message: "Test lab not found." });
  }

  return sendJson(res, 200, { lab });
}

async function handleTestLabUpdate(res, body) {
  const labId = normalizeText(body.labId);
  const openHours = normalizeText(body.openHours);
  const phone = normalizeText(body.phone);
  const testsAvailable = Array.isArray(body.testsAvailable)
    ? body.testsAvailable.map(normalizeText).filter(Boolean)
    : String(body.testsAvailable || "")
        .split(",")
        .map(normalizeText)
        .filter(Boolean);
  const homeCollection = Boolean(body.homeCollection);

  if (!labId || !openHours || !phone || !testsAvailable.length) {
    return sendJson(res, 400, { message: "Lab ID, phone, open hours, and available tests are required." });
  }

  const result = await getCollection("testLabs").findOneAndUpdate(
    { id: labId },
    {
      $set: {
        openHours,
        phone,
        homeCollection,
        testsAvailable,
        updatedAt: new Date().toISOString()
      }
    },
    {
      returnDocument: "after",
      projection: { _id: 0, passwordHash: 0, passwordSalt: 0, emailHash: 0 }
    }
  );

  if (!result) {
    return sendJson(res, 404, { message: "Test lab not found." });
  }

  return sendJson(res, 200, {
    message: "Lab details updated successfully.",
    lab: result
  });
}

async function handleTestLabBooking(res, body) {
  const booking = {
    fullName: normalizeText(body.fullName),
    mobileNumber: normalizeText(body.mobileNumber),
    email: normalizeEmail(body.email),
    address: normalizeText(body.address),
    city: normalizeText(body.city),
    labId: normalizeText(body.labId),
    labName: normalizeText(body.labName),
    preferredDate: normalizeText(body.preferredDate),
    testType: normalizeText(body.testType),
    notes: normalizeText(body.notes),
    homeCollection: Boolean(body.homeCollection)
  };

  if (!booking.fullName || !booking.mobileNumber || !booking.address || !booking.labId || !booking.labName || !booking.preferredDate || !booking.testType) {
    return sendJson(res, 400, { message: "Please complete all required lab booking details." });
  }

  const bookingId = crypto.randomUUID();
  await getCollection("testLabBookings").insertOne({
    id: bookingId,
    fullName: booking.fullName,
    mobileNumber: booking.mobileNumber,
    email: booking.email,
    address: booking.address,
    city: booking.city,
    labId: booking.labId,
    labName: booking.labName,
    preferredDate: booking.preferredDate,
    testType: booking.testType,
    notes: booking.notes,
    homeCollection: booking.homeCollection,
    status: "Booking received",
    createdAt: new Date().toISOString()
  });

  return sendJson(res, 201, {
    message: "Lab test booked successfully.",
    booking: {
      id: bookingId,
      labName: booking.labName,
      preferredDate: booking.preferredDate,
      testType: booking.testType,
      status: "Booking received"
    }
  });
}

async function handleTestLabBookingsLookup(res, mobileNumber) {
  if (!mobileNumber) {
    return sendJson(res, 400, { message: "Mobile number is required." });
  }

  const bookings = await getCollection("testLabBookings")
    .find({ mobileNumber })
    .sort({ createdAt: -1 })
    .limit(10)
    .toArray();

  return sendJson(res, 200, {
    bookings: bookings.map((booking) => ({
      id: booking.id,
      fullName: booking.fullName,
      mobileNumber: booking.mobileNumber,
      email: booking.email,
      address: booking.address,
      city: booking.city,
      labId: booking.labId,
      labName: booking.labName,
      preferredDate: booking.preferredDate,
      testType: booking.testType,
      notes: booking.notes,
      homeCollection: Boolean(booking.homeCollection),
      status: booking.status || "Booking received",
      createdAt: booking.createdAt
    }))
  });
}

async function handleHospitalLogin(res, body) {
  const email = normalizeEmail(body.email);
  const password = String(body.password || "");

  if (!email || !password) {
    return sendJson(res, 400, { message: "Email and password are required." });
  }

  const hospital = await getCollection("hospitals").findOne({
    emailHash: hashForLookup(email)
  });

  if (!hospital || !verifyPassword(password, hospital.passwordSalt, hospital.passwordHash)) {
    return sendJson(res, 401, { message: "Invalid hospital email or password." });
  }

  const publicHospital = {
    id: hospital.id,
    name: hospital.name,
    email: hospital.email,
    address: hospital.address,
    city: hospital.city,
    phone: hospital.phone,
    totalBeds: hospital.totalBeds,
    availableBeds: hospital.availableBeds,
    availableIcuBeds: hospital.availableIcuBeds,
    availableOxygenBeds: hospital.availableOxygenBeds
  };

  return sendJson(res, 200, {
    message: "Hospital login successful.",
    token: createToken({
      id: hospital.id,
      name: hospital.name,
      email: hospital.email
    }),
    hospital: publicHospital
  });
}

async function handleHospitalDashboardLookup(res, email) {
  if (!email) {
    return sendJson(res, 400, { message: "Hospital email is required." });
  }

  const hospital = await getCollection("hospitals").findOne(
    { emailHash: hashForLookup(email) },
    { projection: { _id: 0, passwordHash: 0, passwordSalt: 0, emailHash: 0 } }
  );

  if (!hospital) {
    return sendJson(res, 404, { message: "Hospital not found." });
  }

  return sendJson(res, 200, { hospital });
}

async function handleHospitalBedsUpdate(res, body) {
  const hospitalId = normalizeText(body.hospitalId);
  const availableBeds = Number(body.availableBeds);
  const availableIcuBeds = Number(body.availableIcuBeds);
  const availableOxygenBeds = Number(body.availableOxygenBeds);

  if (!hospitalId || Number.isNaN(availableBeds) || Number.isNaN(availableIcuBeds) || Number.isNaN(availableOxygenBeds)) {
    return sendJson(res, 400, { message: "Hospital ID and bed counts are required." });
  }

  if (availableBeds < 0 || availableIcuBeds < 0 || availableOxygenBeds < 0) {
    return sendJson(res, 400, { message: "Bed counts cannot be negative." });
  }

  const result = await getCollection("hospitals").findOneAndUpdate(
    { id: hospitalId },
    {
      $set: {
        availableBeds,
        availableIcuBeds,
        availableOxygenBeds,
        updatedAt: new Date().toISOString()
      }
    },
    {
      returnDocument: "after",
      projection: { _id: 0, passwordHash: 0, passwordSalt: 0, emailHash: 0 }
    }
  );

  if (!result) {
    return sendJson(res, 404, { message: "Hospital not found." });
  }

  return sendJson(res, 200, {
    message: "Bed availability updated successfully.",
    hospital: result
  });
}

async function handlePharmacyLogin(res, body) {
  const email = normalizeEmail(body.email);
  const password = String(body.password || "");

  if (!email || !password) {
    return sendJson(res, 400, { message: "Email and password are required." });
  }

  const pharmacy = await getCollection("pharmacies").findOne({
    emailHash: hashForLookup(email)
  });

  if (!pharmacy || !verifyPassword(password, pharmacy.passwordSalt, pharmacy.passwordHash)) {
    return sendJson(res, 401, { message: "Invalid pharmacy email or password." });
  }

  const publicPharmacy = {
    id: pharmacy.id,
    name: pharmacy.name,
    email: pharmacy.email,
    phone: pharmacy.phone,
    address: pharmacy.address,
    city: pharmacy.city,
    openHours: pharmacy.openHours,
    deliveryAvailable: Boolean(pharmacy.deliveryAvailable)
  };

  return sendJson(res, 200, {
    message: "Pharmacy login successful.",
    token: createToken({
      id: pharmacy.id,
      name: pharmacy.name,
      email: pharmacy.email
    }),
    pharmacy: publicPharmacy
  });
}

async function handlePharmacyOrdersByEmail(res, email) {
  if (!email) {
    return sendJson(res, 400, { message: "Pharmacy email is required." });
  }

  const pharmacy = await getCollection("pharmacies").findOne({
    emailHash: hashForLookup(email)
  });

  if (!pharmacy) {
    return sendJson(res, 404, { message: "Pharmacy not found." });
  }

  const orders = await getCollection("pharmacyOrders")
    .find({ pharmacyName: pharmacy.name })
    .sort({ createdAt: -1 })
    .toArray();

  return sendJson(res, 200, {
    orders: orders.map((order) => ({
      id: order.id,
      fullName: order.fullName,
      mobileNumber: order.mobileNumber,
      address: order.address,
      city: order.city,
      pharmacyId: order.pharmacyId,
      pharmacyName: order.pharmacyName,
      notes: order.notes,
      prescriptionImage: order.prescriptionImage,
      status: order.status || "Order received",
      estimatedDelivery: order.estimatedDelivery || "Within 90 minutes",
      createdAt: order.createdAt
    }))
  });
}

async function handleDoctorLogin(res, body) {
  const email = normalizeEmail(body.email);
  const password = String(body.password || "");

  if (!email || !password) {
    return sendJson(res, 400, { message: "Email and password are required." });
  }

  const doctor = await getCollection("doctors").findOne({
    emailHash: hashForLookup(email)
  });

  if (!doctor || !verifyPassword(password, doctor.passwordSalt, doctor.passwordHash)) {
    return sendJson(res, 401, { message: "Invalid doctor email or password." });
  }

  const publicDoctor = {
    id: doctor.id,
    name: doctor.name,
    email: doctor.email,
    specialization: doctor.specialization,
    createdAt: doctor.createdAt
  };

  return sendJson(res, 200, {
    message: "Doctor login successful.",
    token: createToken({
      id: doctor.id,
      name: doctor.name,
      email: doctor.email
    }),
    doctor: publicDoctor
  });
}

async function handleDoctorAppointmentsLookup(res, email) {
  if (!email) {
    return sendJson(res, 400, { message: "Doctor email is required." });
  }

  const appointments = await getCollection("appointments")
    .find({ doctorEmail: email })
    .sort({ createdAt: -1 })
    .toArray();

  return sendJson(res, 200, {
    appointments: appointments.map((appointment) => ({
      id: appointment.id,
      fullName: appointment.fullName,
      dob: appointment.dob,
      email: appointment.email,
      phone: appointment.phone,
      doctor: appointment.doctor,
      doctorEmail: appointment.doctorEmail || "",
      appointmentDate: appointment.appointmentDate,
      timeSlot: appointment.timeSlot,
      reason: appointment.reason,
      existingPatient: Boolean(appointment.existingPatient),
      patientId: appointment.patientId || "",
      consultationLink: appointment.consultationLink || "",
      chatLink: appointment.id
        ? `${APP_BASE_URL}/consultation.html?appointmentId=${encodeURIComponent(appointment.id)}&role=doctor&name=${encodeURIComponent(appointment.doctor)}`
        : "",
      createdAt: appointment.createdAt
    }))
  });
}

async function handleCheckup(res, body) {
  const booking = {
    packageName: normalizeText(body.packageName),
    fullName: normalizeText(body.fullName),
    email: normalizeEmail(body.email),
    phone: normalizeText(body.phone),
    preferredDate: normalizeText(body.preferredDate),
    notes: normalizeText(body.notes)
  };

  if (!booking.packageName || !booking.fullName || !booking.email || !booking.phone || !booking.preferredDate) {
    return sendJson(res, 400, { message: "Please complete all required checkup booking details." });
  }

  await getCollection("checkupBookings").insertOne({
    id: crypto.randomUUID(),
    encryptedPayload: encryptValue(JSON.stringify(booking)),
    createdAt: new Date().toISOString()
  });

  return sendJson(res, 201, {
    message: "Checkup request saved successfully."
  });
}

function handleMedicineInfo(res, medicineName) {
  if (!medicineName) {
    return sendJson(res, 400, { message: "Medicine name is required." });
  }

  const searchUrl = `https://api.fda.gov/drug/label.json?search=openfda.brand_name:${encodeURIComponent(medicineName)}`;

  https
    .get(searchUrl, (apiRes) => {
      let rawData = "";

      apiRes.on("data", (chunk) => {
        rawData += chunk;
      });

      apiRes.on("end", () => {
        try {
          const data = JSON.parse(rawData || "{}");
          const medicine = data.results && data.results[0];

          if (!medicine) {
            return sendJson(res, 404, {
              message: "No information found for the specified medicine."
            });
          }

          return sendJson(res, 200, {
            brandName: medicine.openfda && medicine.openfda.brand_name ? medicine.openfda.brand_name[0] : medicineName,
            purpose: Array.isArray(medicine.purpose) ? medicine.purpose : [],
            warnings: Array.isArray(medicine.warnings) ? medicine.warnings : [],
            directions: Array.isArray(medicine.directions) ? medicine.directions : []
          });
        } catch (error) {
          console.error(error);
          return sendJson(res, 502, { message: "Could not parse medicine information." });
        }
      });
    })
    .on("error", (error) => {
      console.error(error);
      return sendJson(res, 502, { message: "Unable to reach the medicine information service right now." });
    });
}

async function handleSubscription(res, body) {
  const email = normalizeEmail(body.email);
  const sourcePage = normalizeText(body.sourcePage);

  if (!email) {
    return sendJson(res, 400, { message: "Email is required to subscribe." });
  }

  const emailHash = hashForLookup(email);
  const existingSubscription = await getCollection("subscriptions").findOne({ emailHash });

  if (existingSubscription) {
    return sendJson(res, 200, { message: "You are already subscribed." });
  }

  await getCollection("subscriptions").insertOne({
    id: crypto.randomUUID(),
    emailHash,
    email,
    sourcePage: sourcePage || "unknown",
    createdAt: new Date().toISOString()
  });

  return sendJson(res, 201, { message: "Thanks for subscribing!" });
}

async function handleContact(res, body) {
  const contact = {
    name: normalizeText(body.name),
    email: normalizeEmail(body.email),
    subject: normalizeText(body.subject),
    message: normalizeText(body.message)
  };

  if (!contact.name || !contact.email || !contact.subject || !contact.message) {
    return sendJson(res, 400, { message: "Please fill out all contact form fields." });
  }

  await getCollection("contacts").insertOne({
    id: crypto.randomUUID(),
    name: contact.name,
    email: contact.email,
    subject: contact.subject,
    message: contact.message,
    createdAt: new Date().toISOString()
  });

  return sendJson(res, 201, { message: "Message sent successfully." });
}

async function handleFeedback(res, body) {
  const feedback = {
    name: normalizeText(body.name),
    email: normalizeEmail(body.email),
    rating: Number(body.rating) || 0,
    feedback: normalizeText(body.feedback)
  };

  if (!feedback.name || !feedback.email || !feedback.feedback) {
    return sendJson(res, 400, { message: "Please complete the feedback form." });
  }

  await getCollection("feedback").insertOne({
    id: crypto.randomUUID(),
    name: feedback.name,
    email: feedback.email,
    rating: feedback.rating,
    feedback: feedback.feedback,
    createdAt: new Date().toISOString()
  });

  return sendJson(res, 201, { message: "Thanks for the feedback!" });
}

async function handleEmergencyRequest(res, body) {
  const request = {
    name: normalizeText(body.name),
    phone: normalizeText(body.phone),
    sourcePage: normalizeText(body.sourcePage)
  };

  if (!request.name) {
    return sendJson(res, 400, { message: "Please provide your name for the emergency request." });
  }

  await getCollection("emergencyRequests").insertOne({
    id: crypto.randomUUID(),
    encryptedPayload: encryptValue(JSON.stringify(request)),
    createdAt: new Date().toISOString()
  });

  return sendJson(res, 201, { message: "Emergency request sent successfully." });
}

async function handleBloodTestAnalysis(res, body) {
  const bloodGroup = normalizeText(body.bloodGroup);
  const wbc = Number(body.wbc);
  const rbc = Number(body.rbc);
  const platelets = Number(body.platelets);

  if (!bloodGroup || Number.isNaN(wbc) || Number.isNaN(rbc) || Number.isNaN(platelets)) {
    return sendJson(res, 400, { message: "Please provide valid blood test values." });
  }

  let resultText = "";
  let skinDiseaseChance = "";
  let cure = "";

  if (wbc < 4.5 || wbc > 11) {
    resultText += "Abnormal white blood cell count. ";
  }

  if (rbc < 4.2 || rbc > 5.4) {
    resultText += "Abnormal red blood cell count. ";
  }

  if (platelets < 150 || platelets > 450) {
    resultText += "Abnormal platelet count. ";
  }

  if (!resultText) {
    resultText = "All blood cell counts are within normal range.";
  }

  if (wbc > 11) {
    skinDiseaseChance = "There is an increased chance of skin disease due to elevated white blood cell count.";
    cure = "Consult a dermatologist for a proper diagnosis and treatment plan. It may include anti-inflammatory medications or topical treatments.";
  } else {
    skinDiseaseChance = "No increased chance of skin disease detected based on these results.";
    cure = "No specific treatment needed. Maintain a healthy lifestyle and good skincare routine.";
  }

  const entry = {
    bloodGroup,
    wbc,
    rbc,
    platelets,
    resultText,
    skinDiseaseChance,
    cure
  };

  await getCollection("bloodTests").insertOne({
    id: crypto.randomUUID(),
    encryptedPayload: encryptValue(JSON.stringify(entry)),
    createdAt: new Date().toISOString()
  });

  return sendJson(res, 200, entry);
}

async function handlePharmacyOrder(res, body) {
  const order = {
    fullName: normalizeText(body.fullName),
    mobileNumber: normalizeText(body.mobileNumber),
    address: normalizeText(body.address),
    city: normalizeText(body.city),
    pharmacyId: normalizeText(body.pharmacyId),
    pharmacyName: normalizeText(body.pharmacyName),
    notes: normalizeText(body.notes),
    prescriptionImage: String(body.prescriptionImage || "").trim()
  };

  if (!order.fullName || !order.mobileNumber || !order.address || !order.pharmacyId || !order.pharmacyName || !order.prescriptionImage) {
    return sendJson(res, 400, { message: "Please fill all order details and upload a prescription image." });
  }

  const orderId = crypto.randomUUID();
  await getCollection("pharmacyOrders").insertOne({
    id: orderId,
    fullName: order.fullName,
    mobileNumber: order.mobileNumber,
    address: order.address,
    city: order.city,
    pharmacyId: order.pharmacyId,
    pharmacyName: order.pharmacyName,
    notes: order.notes,
    prescriptionImage: order.prescriptionImage,
    status: "Order received",
    estimatedDelivery: "Within 90 minutes",
    createdAt: new Date().toISOString()
  });

  return sendJson(res, 201, {
    message: "Prescription order placed successfully.",
    order: {
      id: orderId,
      pharmacyName: order.pharmacyName,
      status: "Order received",
      estimatedDelivery: "Within 90 minutes"
    }
  });
}

async function handlePharmacyOrdersLookup(res, mobileNumber) {
  if (!mobileNumber) {
    return sendJson(res, 400, { message: "Mobile number is required." });
  }

  const orders = await getCollection("pharmacyOrders")
    .find({ mobileNumber })
    .sort({ createdAt: -1 })
    .limit(10)
    .toArray();

  return sendJson(res, 200, {
    orders: orders.map((order) => ({
      id: order.id,
      fullName: order.fullName,
      mobileNumber: order.mobileNumber,
      address: order.address,
      city: order.city,
      pharmacyId: order.pharmacyId,
      pharmacyName: order.pharmacyName,
      notes: order.notes,
      status: order.status || "Order received",
      estimatedDelivery: order.estimatedDelivery || "Within 90 minutes",
      createdAt: order.createdAt
    }))
  });
}

async function handlePharmacyOrderStatusUpdate(res, body) {
  const orderId = normalizeText(body.orderId);
  const status = normalizeText(body.status);
  const estimatedDelivery = normalizeText(body.estimatedDelivery);

  if (!orderId || !status) {
    return sendJson(res, 400, { message: "Order ID and status are required." });
  }

  const allowedStatuses = new Set([
    "Order received",
    "Accepted",
    "Preparing medicines",
    "Out for delivery",
    "Delivered",
    "Cancelled"
  ]);

  if (!allowedStatuses.has(status)) {
    return sendJson(res, 400, { message: "Invalid pharmacy order status." });
  }

  const result = await getCollection("pharmacyOrders").findOneAndUpdate(
    { id: orderId },
    {
      $set: {
        status,
        estimatedDelivery: estimatedDelivery || "Within 90 minutes",
        updatedAt: new Date().toISOString()
      }
    },
    { returnDocument: "after" }
  );

  if (!result) {
    return sendJson(res, 404, { message: "Pharmacy order not found." });
  }

  return sendJson(res, 200, {
    message: "Order status updated successfully.",
    order: {
      id: result.id,
      status: result.status,
      estimatedDelivery: result.estimatedDelivery,
      updatedAt: result.updatedAt
    }
  });
}

async function handleChatLookup(res, appointmentId) {
  if (!appointmentId) {
    return sendJson(res, 400, { message: "Appointment ID is required." });
  }

  const messages = await getCollection("chatMessages")
    .find({ appointmentId })
    .sort({ createdAt: 1 })
    .toArray();

  return sendJson(res, 200, {
    messages: messages.map((message) => ({
      id: message.id,
      appointmentId: message.appointmentId,
      senderName: message.senderName,
      senderRole: message.senderRole,
      message: message.message,
      createdAt: message.createdAt
    }))
  });
}

async function handleChatMessage(res, body) {
  const appointmentId = normalizeText(body.appointmentId);
  const senderName = normalizeText(body.senderName);
  const senderRole = normalizeText(body.senderRole);
  const message = normalizeText(body.message);

  if (!appointmentId || !senderName || !senderRole || !message) {
    return sendJson(res, 400, { message: "Please complete all chat message details." });
  }

  const chatMessage = {
    id: crypto.randomUUID(),
    appointmentId,
    senderName,
    senderRole,
    message,
    createdAt: new Date().toISOString()
  };

  await getCollection("chatMessages").insertOne(chatMessage);
  return sendJson(res, 201, { message: "Message sent.", chatMessage });
}

function serveStaticFile(req, res, pathname) {
  let filePath = pathname === "/" ? path.join(BASE_DIR, "index.html") : path.join(BASE_DIR, decodeURIComponent(pathname));
  filePath = path.normalize(filePath);

  if (!filePath.startsWith(BASE_DIR)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  fs.stat(filePath, (error, stats) => {
    if (!error && stats.isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }

    fs.readFile(filePath, (readError, content) => {
      if (readError) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Not found");
        return;
      }

      const extension = path.extname(filePath).toLowerCase();
      if (extension === ".html") {
        const html = injectSharedClientScript(content.toString("utf8"));
        res.writeHead(200, { "Content-Type": MIME_TYPES[extension] || "application/octet-stream" });
        res.end(html);
        return;
      }

      res.writeHead(200, { "Content-Type": MIME_TYPES[extension] || "application/octet-stream" });
      res.end(content);
    });
  });
}

function injectSharedClientScript(html) {
  const scriptTag = '<script src="/js/site-api.js" defer></script>';
  if (html.includes(scriptTag)) {
    return html;
  }

  if (html.includes("</body>")) {
    return html.replace("</body>", `${scriptTag}\n</body>`);
  }

  return `${html}\n${scriptTag}`;
}

function getCollection(name) {
  if (!database) {
    throw new Error("MongoDB is not connected yet.");
  }

  return database.collection(name);
}

async function sendDoctorAppointmentEmail(details) {
  if (!doctorTransporter) {
    console.log(`Doctor email skipped for ${details.doctorEmail}. SMTP is not configured.`);
    return;
  }

  await doctorTransporter.sendMail({
    from: SMTP_FROM,
    to: details.doctorEmail,
    subject: `New UniCura appointment for ${details.doctorName}`,
    text: [
      `Doctor: ${details.doctorName}`,
      `Patient: ${details.patientName}`,
      `Patient email: ${details.patientEmail}`,
      `Patient phone: ${details.patientPhone}`,
      `Date: ${details.appointmentDate}`,
      `Time: ${details.timeSlot}`,
      `Reason: ${details.reason}`,
      `Video consultation: ${details.consultationLink}`,
      `Doctor chat link: ${details.chatLink}`
    ].join("\n")
  });
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(a));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let rawBody = "";

    req.on("data", (chunk) => {
      rawBody += chunk;
      if (rawBody.length > 1_000_000) {
        reject(new Error("Request body is too large."));
      }
    });

    req.on("end", () => {
      if (!rawBody) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(rawBody));
      } catch (error) {
        reject(new Error("Invalid JSON payload."));
      }
    });

    req.on("error", reject);
  });
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeText(value) {
  return String(value || "").trim();
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}

function verifyPassword(password, salt, expectedHash) {
  const actualHash = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(actualHash, "hex"), Buffer.from(expectedHash, "hex"));
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

function hashForLookup(value) {
  return crypto.createHmac("sha256", LOOKUP_SECRET).update(String(value)).digest("hex");
}

function createToken(user) {
  const header = toBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = toBase64Url(
    JSON.stringify({
      sub: user.id,
      email: user.email,
      name: user.name,
      exp: Date.now() + 1000 * 60 * 60 * 24
    })
  );
  const signature = crypto.createHmac("sha256", TOKEN_SECRET).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${signature}`;
}

function toBase64Url(value) {
  return Buffer.from(value).toString("base64url");
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}
