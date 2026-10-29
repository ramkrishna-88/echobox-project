const bcrypt = require('bcryptjs');
const User = require('./models/User');

async function migratePlaintextPasswords() {
  let migrated = 0;
  const users = User.find({}).select('+password').cursor();

  for await (const user of users) {
    if (/^\$2[aby]\$/.test(user.password)) continue;
    user.password = await bcrypt.hash(user.password, 12);
    await user.save();
    migrated += 1;
  }

  if (migrated > 0) console.log(`Secured ${migrated} existing account password(s).`);
  return migrated;
}

module.exports = { migratePlaintextPasswords };
