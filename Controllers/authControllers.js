const User = require('../models/usersModel')
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require('dotenv').config()

const createUser = async (req, res) => {
  try {
    // 1. Only DC can create users
    

    // 2. Extract data
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

module.exports = { createUser };



const signIn = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user._id, role: user.role },process.env.JWT_SECRET ,{ expiresIn: "1d" });

    res.status(200).json({
      message: "Sign-in successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        tehsil: user.tehsil,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};



module.exports = {
  createUser,
  signIn
}
