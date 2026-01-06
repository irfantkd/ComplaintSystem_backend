// seeds/seedZila.js

const mongoose = require('mongoose');
const Zila = require('../models/zilaModel');
require('dotenv').config();

const MONGO_URI = "mongodb+srv://irfantkd:pc120irfan@notetakeing.yze0q5w.mongodb.net/COMPLAINTSYSTEM";

if (!MONGO_URI) {
  console.error('Error: MONGO_URI is not defined in .env file');
  process.exit(1);
}

const seedZila = async () => {
  try {
    // Connect and wait for it to finish
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected successfully for seeding');

    await Zila.create({ name: 'Lodhran' });
    console.log('Zila "Lodhran" seeded successfully!');

    // Close connection
    await mongoose.connection.close();
    console.log('Connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error.message);
    process.exit(1);
  }
};

// Run the function
seedZila();