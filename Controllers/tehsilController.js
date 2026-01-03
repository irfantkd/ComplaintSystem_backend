const Tehsil = require('../models/tehsilModel')
const User = require('../models/usersModel')


const createTehsil = async (req, res) => {
  try {
    
    const user = await User.findById(req.user.id);
    if (!user || user.role !== "DC") {
      return res.status(403).json({
        message: "Only DC can create a Tehsil",
      });
    }

    
    const { name, zilaId } = req.body;


    if (!name || !zilaId) {
      return res.status(400).json({
        message: "Tehsil name and Zila ID are required",
      });
    }

    
    const existingTehsil = await Tehsil.findOne({ name, zilaId });
    if (existingTehsil) {
      return res.status(400).json({
        message: "Tehsil with this name already exists in this Zila",
      });
    }


    const tehsil = await Tehsil.create({
      name,
      zilaId,
    });

    res.status(201).json({
      message: "Tehsil created successfully",
      tehsil: {
        id: tehsil._id,
        name: tehsil.name,
        zilaId: tehsil.zilaId,
        createdAt: tehsil.createdAt,
      },
    });
  } catch (error) {
    console.error("Create Tehsil Error:", error.message);
    res.status(500).json({
      message: "Server Error",
    });
  }
};

module.exports = { createTehsil };
