require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/echobox';

async function ensureAdminUser() {
  const existingAdmin = await User.findOne({ username: 'admin' });

  if (existingAdmin) {
    console.log('Admin exists.');
    return { created: false };
  }

  if (process.env.NODE_ENV === 'production' && !process.env.ADMIN_PASSWORD) {
    throw new Error('ADMIN_PASSWORD must be set before creating the production admin account.');
  }
  const adminPassword = process.env.ADMIN_PASSWORD || 'password';
  if (adminPassword.length < 8) throw new Error('ADMIN_PASSWORD must be at least 8 characters.');
  const password = await bcrypt.hash(adminPassword, 12);
  await User.create({ username: 'admin', password, isAdmin: true });
  console.log('Admin created.');
  return { created: true };
}

if (require.main === module) {
  mongoose.connect(MONGO_URI)
    .then(async () => {
      await ensureAdminUser();
      await mongoose.disconnect();
      process.exit();
    })
    .catch(async err => {
      console.error('Error:', err);
      try {
        await mongoose.disconnect();
      } catch (disconnectError) {
        console.error('Disconnect Error:', disconnectError);
      }
      process.exit(1);
    });
}

module.exports = { ensureAdminUser };
