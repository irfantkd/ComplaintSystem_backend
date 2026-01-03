const User = require('../models/usersModel')
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require('dotenv').config()



const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
};




const createUser = async (req, res) => {
  try {
    const {
      name,
      username,
      password,
      role,
      zilaId,
      tehsilId,
      mcId,
    } = req.body;

    // 3. Basic validation
    if (!name || !username || !password || !role ) {
      return res.status(400).json({
        message: "Missing required fields",
      });
    }

    // 4. Role-based required fields
    if (["AC", "VOLUNTEER"].includes(role) && !tehsilId) {
      return res.status(400).json({
        message: `${role} must be assigned to a Tehsil`,
      });
    }

    if (["MC_COO", "MC_EMPLOYEE"].includes(role) && (!tehsilId || !mcId)) {
      return res.status(400).json({
        message: `${role} must be assigned to Tehsil and MC`,
      });
    }

    // 5. Check existing username
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({
        message: "Username already exists",
      });
    }

    // 6. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 7. Create user
    const newUser = await User.create({
      name,
      username,
      password: hashedPassword,
      role,
      zilaId,
      tehsilId: tehsilId || undefined,
      mcId: mcId || undefined,
    });

    // 8. Response
    res.status(201).json({
      message: "User created successfully",
      user: {
        id: newUser._id,
        name: newUser.name,
        username: newUser.username,
        role: newUser.role,
        zilaId: newUser.zilaId,
        tehsilId: newUser.tehsilId,
        mcId: newUser.mcId,
      },
    });
  } catch (error) {
    console.error("Create User Error:", error.message);
    res.status(500).json({
      message: error.message || "Server error",
    });
  }
};





/**
 * Sign-in for Admin Dashboard roles:
 * DC, DISTRICT_COUNCIL_OFFICER, AC, MC_COO
 */
const adminSignIn = async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log("This is request",req.body)

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }

    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    // Only allow admin roles
    const adminRoles = ["DC", "DISTRICT_COUNCIL_OFFICER", "AC", "MC_COO"];
    if (!adminRoles.includes(user.role)) {
      return res.status(403).json({ message: "Access denied: Not an admin user" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = generateToken(user);

    res.status(200).json({
      message: "Admin sign-in successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        role: user.role,
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
 * MC_EMPLOYEE, VOLUNTEER
 */
const fieldSignIn = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }

    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    
    const fieldRoles = ["MC_EMPLOYEE", "VOLUNTEER"];
    if (!fieldRoles.includes(user.role)) {
      return res.status(403).json({ message: "Access denied: Not a field user" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = generateToken(user);

    res.status(200).json({
      message: "Field user sign-in successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        role: user.role,
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
  createUser,
  adminSignIn,
  fieldSignIn,
};

