const zilla = require("../models/zilaModel");

const getZilla = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: "Unauthorized user" });
    }
    const zila = await zilla.find();
    res
      .status(200)
      .json({
        success: true,
        message: "Data fetched successfully",
        data: zila,
      });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error " });
  }
};

module.exports = {
  getZilla,
};
