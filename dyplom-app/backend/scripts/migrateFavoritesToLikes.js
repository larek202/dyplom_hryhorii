require('dotenv').config();
const connectDB = require('../config/database');
const { migrateFavoritesToLikes } = require('../utils/migrateFavoritesToLikes');

async function run() {
  await connectDB();
  const result = await migrateFavoritesToLikes();
  console.log('🩹 Favorites→Likes migration finished:', result);
  process.exit(0);
}

run().catch((error) => {
  console.error('⚠️ Favorites→Likes migration failed:', error.message);
  process.exit(1);
});
