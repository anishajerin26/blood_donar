// server.js
const express = require('express');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { connectDB, getDB } = require('./db/mongo');

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// -------------------- SESSION SETUP --------------------
app.use(
  session({
    secret: process.env.SESSION_SECRET || "my_secret_key_123",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 } // 1 hour
  })
);

// -------------------- USER SIGNUP + LOGIN --------------------
const { ObjectId } = require("mongodb");

// SIGNUP
app.post('/api/signup', async (req, res) => {
  const db = getDB();
  const users = db.collection("users");

  const { name, email, password } = req.body;

  if (!name || !email || !password)
    return res.status(400).json({ ok: false, error: "All fields required" });

  const exists = await users.findOne({ email });
  if (exists)
    return res.status(400).json({ ok: false, error: "Email already registered" });

  const hashed = await bcrypt.hash(password, 10);

  await users.insertOne({ name, email, password: hashed, created_at: new Date() });

  res.json({ ok: true, message: "Signup successful" });
});

// USER LOGIN
app.post('/api/user/login', async (req, res) => {
  const db = getDB();
  const users = db.collection("users");

  const { email, password } = req.body;

  const user = await users.findOne({ email });
  if (!user) return res.status(400).json({ ok: false, error: "User not found" });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ ok: false, error: "Incorrect password" });

  req.session.user = { id: user._id, email: user.email, name: user.name };

  res.json({ ok: true, message: "Login successful" });
});

// USER LOGOUT
app.get('/api/user/logout', (req, res) => {
  req.session.destroy();
  res.json({ ok: true, message: "Logged out" });
});

// PROTECT USER ROUTES
function userAuth(req, res, next) {
  if (req.session.user) return next();
  res.status(403).json({ ok: false, error: "Login required" });
}

// -------------------- ADMIN LOGIN --------------------
// -------------------- ADMIN LOGIN SYSTEM --------------------
const ADMIN_USER = "admin";
const ADMIN_PASS = "admin123";

// Admin Login
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;

  if (username === ADMIN_USER && password === ADMIN_PASS) {
    req.session.admin = true;
    return res.json({ ok: true, message: "Admin login successful" });
  }
  return res.status(401).json({ ok: false, error: "Invalid admin login" });
});

// Admin Logout
app.get('/api/admin/logout', (req, res) => {
  req.session.admin = false;
  req.session.destroy();
  res.json({ ok: true, message: "Admin logged out" });
});

// Check admin session
app.get('/api/check-admin', (req, res) => {
  res.json({ isAdmin: !!req.session.admin });
});

// Protect Admin Actions
function adminAuth(req, res, next) {
  if (req.session.admin) return next();
  return res.status(403).json({ ok: false, error: "Admin only" });
}


// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});
// Check user/admin login session
app.get('/api/check-session', (req, res) => {
  if (req.session.admin) {
    return res.json({ loggedIn: true, isAdmin: true, user: null });
  }
  if (req.session.user) {
    return res.json({ loggedIn: true, isAdmin: false, user: req.session.user });
  }
  return res.json({ loggedIn: false });
});

// -------------------- CONNECT DB + ROUTES --------------------
connectDB().then(() => {
  const db = getDB();
  const donors = db.collection('donors');
  const requests = db.collection('requests');

  // DONORS
  app.post('/api/donors', async (req, res) => {
    try {
      const { name, blood_group, phone, city, availability = "Available" } = req.body;
      const doc = { name, blood_group, phone, city, availability };
      const result = await donors.insertOne(doc);
      res.json({ ok: true, id: result.insertedId });
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  app.get('/api/donors', async (req, res) => {
    const { blood_group, city } = req.query;
    const filter = {};
    if (blood_group) filter.blood_group = blood_group;
    if (city) filter.city = new RegExp(`^${city}$`, 'i');
    const items = await donors.find(filter).toArray();
    res.json({ ok: true, donors: items });
  });

  // REQUESTS
  app.post('/api/requests', async (req, res) => {
    const { patient_name, blood_group, hospital, city, contact_phone } = req.body;
    const doc = {
      patient_name,
      blood_group,
      hospital,
      city,
      contact_phone,
      status: "Pending",
      created_at: new Date()
    };
    await requests.insertOne(doc);
    res.json({ ok: true });
  });

  app.get('/api/requests', async (req, res) => {
    const list = await requests.find().sort({ created_at: -1 }).toArray();
    res.json({ ok: true, requests: list });
  });

  // ADMIN: MARK COMPLETED
  app.put('/api/requests/:id', adminAuth, async (req, res) => {
    try {
      const { id } = req.params;

      await requests.updateOne(
        { _id: new ObjectId(id) },
        { $set: { status: "Completed" } }
      );

      res.json({ ok: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ ok: false, error: "Failed to update status" });
    }
  });

  // ---------- START SERVER ----------
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () =>
    console.log(`🚀 Server running at http://localhost:${PORT}`)
  );

}); // ← closes connectDB().then(...)
