const Like = require('../models/Like');
const User = require('../models/User');

async function migrateFavoritesToLikes() {
  const users = await User.find({
    favorites: { $exists: true, $not: { $size: 0 } },
  }).select('_id favorites');

  let scanned = 0;
  let created = 0;

  for (const user of users) {
    for (const favId of user.favorites || []) {
      if (!favId) continue;
      scanned += 1;
      const upd = await Like.updateOne(
        { userId: user._id, eventId: favId },
        { $setOnInsert: { userId: user._id, eventId: favId, createdAt: new Date() } },
        { upsert: true }
      );
      if (upd.upsertedCount > 0) created += 1;
    }
  }

  return {
    usersScanned: users.length,
    favoritesScanned: scanned,
    likesCreated: created,
  };
}

module.exports = { migrateFavoritesToLikes };
