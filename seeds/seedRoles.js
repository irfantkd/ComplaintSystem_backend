const mongoose = require("mongoose");
const Role = require("../models/roleModels"); // Adjust path if needed
require("dotenv").config();

// MongoDB connection
const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb+srv://irfantkd:pc120irfan@notetakeing.yze0q5w.mongodb.net/COMPLAINTSYSTEM";

if (!MONGO_URI) {
  console.error("Error: MONGO_URI is not defined in .env file");
  process.exit(1);
}

const seedRoles = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("MongoDB connected successfully for seeding Roles");

    // Roles to insert
    const rolesToSeed = [
      "DISTRICT_COUNCIL_OFFICER",
      "DISTRICT_COUNCIL_EMPLOYEE",
      "AC",
      "MC_COO",
      "MC_EMPLOYEE",
      "USER",
    ];

    // Check if RoleConfig already exists
    let roleConfig = await Role.findOne();
    if (!roleConfig) {
      // Create new RoleConfig with roles
      roleConfig = new Role({
        roles: rolesToSeed.map((roleName) => ({
          name: roleName,
          isActive: true,
        })),
      });
    } else {
      // Add any missing roles to existing RoleConfig
      const existingRoleNames = roleConfig.roles.map((r) => r.name);
      const newRoles = rolesToSeed
        .filter((r) => !existingRoleNames.includes(r))
        .map((r) => ({ name: r, isActive: true }));

      roleConfig.roles.push(...newRoles);
    }

    await roleConfig.save();
    console.log("Roles seeded/updated successfully!");
    console.log(roleConfig.roles);

    await mongoose.connection.close();
    console.log("Connection closed");
    process.exit(0);
  } catch (error) {
    console.error("Seeding Roles failed:", error.message);
    process.exit(1);
  }
};

seedRoles();
