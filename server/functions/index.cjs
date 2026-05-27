const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineString } = require('firebase-functions/params');
const mongoose = require("mongoose");
const app = require("./app.cjs");

// Define Params
const mongoUri = defineString('MONGODB_URI');

// Helper to ensure DB is connected
async function connectDb() {
  if (mongoose.connection.readyState !== 1) {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(mongoUri.value());
  }
}

// 1. The Main API (Express App)
exports.api = onRequest({ 
  invoker: "public",
  timeoutSeconds: 120,
  memory: "1GiB",
  region: "us-central1" 
}, async (req, res) => {
  await connectDb();
  return app(req, res);
});

// 2. The Daily Reminders (Replacing setInterval)
exports.dailyReminders = onSchedule("0 9 * * *", async (event) => {
  // Runs every day at 09:00 AM
  await connectDb();
  
  // Adjusted paths to point to the parent directory folders
  const salesRoutes = require('./routes/sales.cjs');
  const Company = require('./models/Company.cjs');

  try {
    const companies = await Company.find({});
    for (const comp of companies) {
      if (typeof salesRoutes.sendDueNotifications === 'function') {
        await salesRoutes.sendDueNotifications(comp._id);
      }
    }
    console.log('Reminders job executed successfully');
  } catch (err) {
    console.error('Error running reminder job:', err);
  }
});