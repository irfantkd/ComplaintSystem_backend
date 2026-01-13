const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Zila = require('../models/zilaModel');        // Your Zila model
const User = require('../models/usersModel');       // Your User model
const Role = require('../models/roleModels');        // Your Role model
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });


// Use the env variable if available
const MONGO_URI = process.env.MONGO_URI

if (!MONGO_URI) {
  console.error('Error: MONGO_URI is not defined in .env file');
  process.exit(1);
}

const seedDC = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected successfully for seeding DC');

    // Find Lodhran Zila
    const lodhranZila = await Zila.findOne({ name: 'Lodhran' });
    if (!lodhranZila) {
      console.error('Error: Zila "Lodhran" not found. Run seedZila.js first!');
      process.exit(1);
    }

    // Find Role "DC" in RoleConfig
    const roleConfig = await Role.findOne();
    if (!roleConfig) {
      console.error('Error: No roles found. Run seedRoles.js first!');
      process.exit(1);
    }

    const dcRole = roleConfig.roles.find(r => r.name === 'DC');
    if (!dcRole) {
      console.error('Error: DC role not found in RoleConfig');
      process.exit(1);
    }

    // Hash a secure password
    const hashedPassword = await bcrypt.hash('12345678', 10);

    // Upsert the DC user with roleId
    const dcUser = await User.findOneAndUpdate(
      { username: 'dc_lodhran' },  // unique username
      {
        name: 'Awais Afzal',
        username: 'dc_lodhran',
        password: hashedPassword,
        roleId: dcRole._id,        // <-- reference the roleId
        zilaId: lodhranZila._id,
        isActive: true,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log('DC User seeded/updated successfully!');
    console.log('Username: dc_lodhran');
    console.log('Password: dc@l0dhr@n2026  ← CHANGE THIS IMMEDIATELY AFTER FIRST LOGIN!');
    console.log('User ID:', dcUser._id);

    await mongoose.connection.close();
    console.log('Connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Seeding DC failed:', error.message);
    process.exit(1);
  }
};

seedDC();
