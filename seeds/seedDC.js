// seeds/seedDC.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Zila = require('../models/zilaModel');        // Your Zila model
const User = require('../models/usersModel');       // Your User model (adjust filename if needed)
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URL;

if (!MONGO_URI) {
  console.error('Error: MONGO_URI is not defined in .env file');
  process.exit(1);
}

const seedDC = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected successfully for seeding DC');

    // Find the existing Lodhran Zila
    const lodhranZila = await Zila.findOne({ name: 'Lodhran' });
    if (!lodhranZila) {
      console.error('Error: Zila "Lodhran" not found. Run seedZila.js first!');
      process.exit(1);
    }

    // Hash a secure password (change this later!)
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash('12345678', saltRounds);  // Strong default password

    // Upsert the DC user (safe to run multiple times)
    const dcUser = await User.findOneAndUpdate(
      { username: 'dc_lodhran' },  // Unique username
      {
        name: 'Awais Afzal',
        username: 'dc_lodhran',
        password: hashedPassword,
        role: 'DC',
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