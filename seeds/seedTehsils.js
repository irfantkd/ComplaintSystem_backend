const mongoose = require("mongoose");
require("dotenv").config({ path: "../.env" });

const Tehsil = require("../models/tehsilModel");
const Zila = require("../models/zilaModel");

const seedTehsils = async () => {
  try {
    console.log("MONGO_URI:", process.env.MONGO_URI);

    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected");

    const zila = await Zila.findOne({ name: "Lodhran" });

    if (!zila) {
      throw new Error("Zila 'Lodhran' not found. Seed Zila first.");
    }

    await Tehsil.insertMany([
      { name: "Lodhran", zilaId: zila._id },
      { name: "Dunyapur", zilaId: zila._id },
      { name: "Kahror Pacca", zilaId: zila._id },
    ]);

    console.log("Tehsils seeded successfully");
    process.exit(0);
  } catch (error) {
    console.error("Seeding Error:", error.message);
    process.exit(1);
  }
};

seedTehsils();
