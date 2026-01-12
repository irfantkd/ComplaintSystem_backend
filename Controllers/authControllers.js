const User = require("../models/usersModel");
const Role = require("../models/roleModels");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

// 🔑 Generate JWT token
const generateToken = (user, roleName) => {
  return jwt.sign(
    { id: user._id, role: roleName },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
};

/**
 * Helper: Get role name from roleId
 */
const getRoleName = async (roleId) => {
  const roleDoc = await Role.findOne();
  if (!roleDoc) return null;

  const role = roleDoc.roles.id(roleId);
  if (!role || !role.isActive) return null;

  return role.name;
};

/**
 * Sign-in for Admin Dashboard roles:
 * DC, DISTRICT_COUNCIL_OFFICER, AC, MC_CO
 */
const adminSignIn = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res
        .status(400)
        .json({ message: "Username and password are required" });

    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    // Get role name from roleId
    const roleName = await getRoleName(user.roleId);
    if (!roleName)
      return res.status(403).json({ message: "Role not found or inactive" });

    // Only allow admin roles
    const adminRoles = ["DC", "DISTRICT_COUNCIL_OFFICER", "AC", "MC_CO"];
    if (!adminRoles.includes(roleName)) {
      return res
        .status(403)
        .json({ message: "Access denied: Not an admin user" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    const token = generateToken(user, roleName);

    res.status(200).json({
      message: "Admin sign-in successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        role: roleName,
        zilaId: user.zilaId,
        tehsilId: user.tehsilId,
        mcId: user.mcId,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error("Admin SignIn Error:", error.message);
    res.status(500).json({ message: "Server Error" });
  }
};

/**
 * Sign-in for Field roles:
 * MC_EMPLOYEE, USER
 * MC_EMPLOYEE, USER
 */
const fieldSignIn = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res
        .status(400)
        .json({ message: "Username and password are required" });

    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    // Get role name from roleId
    const roleName = await getRoleName(user.roleId);
    if (!roleName)
      return res.status(403).json({ message: "Role not found or inactive" });

    const fieldRoles = ["MC_EMPLOYEE", "USER", "DISTRICT_COUNCIL_EMPLOYEE"];

    if (!fieldRoles.includes(roleName)) {
      return res
        .status(403)
        .json({ message: "Access denied: Not a field user" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    const token = generateToken(user, roleName);

    res.status(200).json({
      message: "Field user sign-in successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        role: roleName,
        zilaId: user.zilaId,
        tehsilId: user.tehsilId,
        mcId: user.mcId,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error("Field SignIn Error:", error.message);
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports = {
  adminSignIn,
  fieldSignIn,
};
