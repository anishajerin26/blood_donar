// server.js
const express = require('express');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const { connectDB, getDB } = require('./db/mongo');

dotenv.config();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static
app.use(express.static(path.join(__dirname, 'public')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// Connect DB once, then mount routes
connectDB().then(() => {
  const db = getDB();
  const donors = db.collection('donors');
  const requests = db.collection('requests');

  // --- DONORS ---

  // Create donor
  app.post('/api/donors', async (req, res) => {
    try {
      const { name, blood_group, phone, city, availability = 'Available' } = req.body;

      if (!name || !blood_group || !phone || !city) {
        return res.status(400).json({ error: 'name, blood_group, phone, city are required' });
      }

      const doc = { name, blood_group, phone, city, availability };
      const result = await donors.insertOne(doc);
      res.json({ ok: true, id: result.insertedId, donor: doc });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to create donor' });
    }
  });

  // Search donors: /api/donors?blood_group=O+&city=Chennai
  app.get('/api/donors', async (req, res) => {
    try {
      const { blood_group, city } = req.query;
      const filter = {};
      if (blood_group) filter.blood_group = blood_group;
      if (city) filter.city = new RegExp(`^${city}$`, 'i'); // case-insensitive exact

      const items = await donors
        .find(filter)
        .project({ name: 1, blood_group: 1, phone: 1, city: 1, availability: 1 })
        .limit(100)
        .toArray();

      res.json({ ok: true, count: items.length, donors: items });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to fetch donors' });
    }
  });

  // Update donor availability
  app.patch('/api/donors/:id/availability', async (req, res) => {
    try {
      const { ObjectId } = require('mongodb');
      const { id } = req.params;
      const { availability } = req.body;
      if (!['Available', 'Not Available'].includes(availability)) {
        return res.status(400).json({ error: 'availability must be "Available" or "Not Available"' });
      }
      const result = await donors.updateOne(
        { _id: new ObjectId(id) },
        { $set: { availability } }
      );
      res.json({ ok: true, modified: result.modifiedCount });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to update availability' });
    }
  });

  // --- REQUESTS ---

  // Create emergency request
  app.post('/api/requests', async (req, res) => {
    try {
      const { patient_name, blood_group, hospital, city, contact_phone } = req.body;

      if (!patient_name || !blood_group || !hospital || !city || !contact_phone) {
        return res.status(400).json({
          error: 'patient_name, blood_group, hospital, city, contact_phone are required'
        });
      }

      const reqDoc = {
        patient_name,
        blood_group,
        hospital,
        city,
        contact_phone,
        status: 'Pending',
        created_at: new Date()
      };
      const result = await requests.insertOne(reqDoc);
      res.json({ ok: true, id: result.insertedId, request: reqDoc });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to create request' });
    }
  });

  // List recent requests
  app.get('/api/requests', async (req, res) => {
    try {
      const { city, blood_group, status } = req.query;
      const filter = {};
      if (city) filter.city = new RegExp(`^${city}$`, 'i');
      if (blood_group) filter.blood_group = blood_group;
      if (status) filter.status = status;

      const items = await requests
        .find(filter)
        .sort({ created_at: -1 })
        .limit(50)
        .toArray();

      res.json({ ok: true, count: items.length, requests: items });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to fetch requests' });
    }
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
});
