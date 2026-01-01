const User = require('../models/usersModel')
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require('dotenv').config()

const createUser = async (req, res) => {
  try {
    const requester = await User.findById(req.user.id);
    if (!requester || requester.role !== "DC") {
      return res.status(403).json({ message: "Only DC can create users" });
    }

    const { name, role, tehsil, phone, email, password } = req.body;
    if (!name || !role || (role !== "DC" && !tehsil) || !email || !password) {
      return res.status(400).json({ message: "All required fields must be provided" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name,
      role,
      tehsil,
      phone,
      email,
      password: hashedPassword,
    });

    res.status(201).json({
      message: "User created successfully",
      user: {
        id: newUser._id,
        name: newUser.name,
        role: newUser.role,
        tehsil: newUser.tehsil,
        email: newUser.email,
        phone: newUser.phone,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};


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
