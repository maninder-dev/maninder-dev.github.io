// Creates the default admin account from node/.env (safe to run more than once)
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');

(async () => {
  try {
    await connectDB();
    const email = (process.env.ADMIN_EMAIL || 'admin@library.com').toLowerCase();
    if (await User.exists({ email })) {
      console.log(`Admin already exists: ${email}`);
    } else {
      await User.create({
        name: process.env.ADMIN_NAME || 'Administrator',
        email,
        password: process.env.ADMIN_PASSWORD || 'Admin@123',
        role: 'admin',
      });
      console.log(`Admin created: ${email}`);
    }
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
