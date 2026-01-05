const Complaint = require('../models/complaintModel')
const cloudinary = require("../config/cloudinaryConfig");
const streamifier = require("streamifier");
const User = require('../models/usersModel')

const createComplaint = async (req, res) => {
  try {
    const userId = req.user.id
    const {
      title,
      description,
      category,
      from,
      tehsil,
      latitude,
      longitude,
      locationName,
    } = req.body;

    const user = await User.findById(userId)
    if(!user){
        return res.status(400).json({message:"User not found"})
    }

    if(user.role !== "VOLUNTEER"){
        return res.status(400).json({message:"User is not authorized"})
    }

    if (!latitude || !longitude) {
      return res.status(400).json({
        message: "Latitude and longitude are required",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        message: "Before image is required",
      });
    }

    

    const streamUpload = (fileBuffer) => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "complaints/before" },
          (error, result) => {
            if (result) resolve(result);
            else reject(error);
          }
        );

        streamifier.createReadStream(fileBuffer).pipe(stream);
      });
    };

    const uploadResult = await streamUpload(req.file.buffer);

    

    const complaint = await Complaint.create({
      title,
      description,
      category,
      from,
      tehsil,
      locationName,
      images: {
        before: uploadResult.secure_url,
      },
      location: {
        type: "Point",
        coordinates: [Number(longitude), Number(latitude)],
      },
      createdBy: req.user.id,
      status: "submitted",
    });
    if(!complaint){
        return res.status(400).json({message:"Complaint failed to create"})
    }

    return res.status(201).json({
      success: true,
      message: "Complaint submitted successfully",
      data: complaint,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Complaint creation failed",
      error: error.message,
    });
  }
};



module.exports = { createComplaint };
