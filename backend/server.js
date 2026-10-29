require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const { seedPosts } = require('./seed');
const { ensureAdminUser } = require('./seedAdmin');
const { migratePlaintextPasswords } = require('./migratePasswords');
const { migrateLegacyReports } = require('./migrateReports');
const User = require('./models/User');
const Notification = require('./models/Notification');
const { authenticate, requireAdmin } = require('./middleware/auth');

const app = express();
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS.'));
  }
}));
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({ status: connected ? 'ok' : 'starting' });
});

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB Connected');
    await User.init();
    await migratePlaintextPasswords();
    const migratedReports = await migrateLegacyReports();
    if (migratedReports) console.log(`Added ${migratedReports} legacy report(s) to the moderation queue.`);
    await ensureAdminUser();
    await seedPosts();
  })
  .catch(err => console.error('MongoDB connection failed:', err.message));

app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);

app.get('/api/admin/notifications', authenticate, requireAdmin, async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
