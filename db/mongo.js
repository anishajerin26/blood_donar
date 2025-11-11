// db/mongo.js
const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');

dotenv.config();

const client = new MongoClient(process.env.MONGO_URI, {
  useUnifiedTopology: true
});

let db;

async function connectDB() {
  if (db) return db;
  await client.connect();
  db = client.db(process.env.DB_NAME || 'blood_donor_app');

  // Helpful indexes
  await db.collection('donors').createIndex({ blood_group: 1, city: 1 });
  await db.collection('requests').createIndex({ blood_group: 1, city: 1, status: 1 });

  console.log('✅ MongoDB connected');
  return db;
}

function getDB() {
  if (!db) throw new Error('DB not initialized. Call connectDB() first.');
  return db;
}

module.exports = { connectDB, getDB };
