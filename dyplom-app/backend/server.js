require('dotenv').config();
try {
  require('dns').setDefaultResultOrder('ipv4first');
} catch {
  /* Node < 17 */
}
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const { createCorsOptions } = require('./config/cors');

// Импорт роутов
const eventRoutes = require('./routes/events');
const authRoutes = require('./routes/auth');
const organizerRoutes = require('./routes/organizer');
const uploadRoutes = require('./routes/upload');
const favoriteRoutes = require('./routes/favorites');
const bookingRoutes = require('./routes/bookings');
const likeRoutes = require('./routes/likes');
const pushTokenRoutes = require('./routes/pushTokens');
const pushTestRoutes = require('./routes/pushTest');
const { startReminderScheduler } = require('./utils/pushReminders');
const { migrateFavoritesToLikes } = require('./utils/migrateFavoritesToLikes');

const app = express();

// Подключение к MongoDB
connectDB();

// CORS: see config/cors.js (Vite + CORS_ORIGIN; prod = only CORS_ORIGIN)
app.use(cors(createCorsOptions()));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Логирование запросов (для разработки)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// Роуты
app.use('/api/events', eventRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/organizer', organizerRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/likes', likeRoutes);
app.use('/api/push-tokens', pushTokenRoutes);
app.use('/api/push-test', pushTestRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Serwer działa',
    database: 'Połączono z MongoDB Atlas'
  });
});

// Обработка 404
app.use((req, res) => {
  res.status(404).json({ error: 'Nie znaleziono endpointu' });
});

// Обработка ошибок
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Wewnętrzny błąd serwera',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}/api`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
});

startReminderScheduler();

// Opcjonalna migracja favorites→likes (włącz przez RUN_FAV_MIGRATION=true)
if (process.env.RUN_FAV_MIGRATION === 'true') {
  migrateFavoritesToLikes()
    .then((result) => console.log('🩹 Favorites→Likes migration completed', result))
    .catch((e) => console.warn('⚠️ Favorites→Likes migration error:', e.message));
}

