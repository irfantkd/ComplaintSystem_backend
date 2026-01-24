const ComplaintCategory = require("../models/complaintCategory");
const mongoose = require("mongoose");
require("dotenv").config({
  path: require("path").resolve(__dirname, "../.env"),
});

const categories = [
  { name: "Street Light", description: "Street Light" },
  { name: "Main Hole Covers", description: "Main Hole Covers" },
  { name: "Severage", description: "Severage" },
  { name: "Dog Bite", description: "Dog Bite" },
];
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("Error: MONGO_URI is not defined in .env file");
  process.exit(1);
}

const seedCategories = async () => {
  try {
    console.log("MONGO_URI:", MONGO_URI);
    await mongoose.connect(MONGO_URI);
    console.log("MongoDB connected");

    await ComplaintCategory.insertMany(categories);
    console.log("Categories seeded successfully");

    process.exit(0);
  } catch (error) {
    console.error("Error seeding categories:", error);
    process.exit(1);
  }
};

seedCategories();
