const MCModel = require("../../models/MCModel");
const userModel = require("../../models/usersModel");

const createMC = async (req, res) => {
  try {
    const dcUser = req.user;

    if (dcUser.role !== "DC") {
      return res.status(403).json({ message: "Access denied. DC only." });
    }
    const { name, tehsilId, zilaId } = req.body;
    const tehsil = await tehsilModel.findById(tehsilId);
    if (!tehsil) {
      return res.status(404).json({ message: "Tehsil not found" });
    }
    const zila = await zillaModel.findById(zilaId);
    if (!zila) {
      return res.status(404).json({ message: "Zila not found" });
    }
    const mc = await MCModel.create({ name, tehsilId, zilaId });
    res.status(201).json({ message: "MC created successfully", mc });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

const deleteMc = async (req, res) => {
  try {
    const dcUser = req.user;
    if (dcUser.role !== "DC") {
      return res.status(403).json({ message: "Access denied. DC only." });
    }
    const { mcId } = req.params;
    if (!mcId) {
      return res.status(400).json({
        message: "MC id is required",
      });
    }
    const mc = await MCModel.findById(mcId);
    if (!mc) {
      return res.status(404).json({
        message: "MC not found",
      });
    }
    if (mc.zilaId.toString() !== dcUser.zilaId.toString()) {
      return res.status(403).json({ message: "Access denied. DC only." });
    }
    const deletedMc = await MCModel.findByIdAndDelete(mcId);
    if (!mcId) {
      return res.status(404).json({
        message: "MC not found",
      });
    }
    res.status(200).json({
      message: "Mc deleted successfully",
      deletedMc,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server error",
    });
  }
};

const getAllMcForDc = async (req, res) => {
  try {
    const dcUser = req.user;
    if (dcUser.role !== "DC") {
      return res.status(403).json({ message: "Access denied. DC only." });
    }
    const mcs = await MCModel.find({ zilaId: dcUser.zilaId });
    return res
      .status(200)
      .json({ message: "Data fetched successfully", data: mcs });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server error",
    });
  }
};
const getMcByIdForDc = async (req, res) => {
  try {
    const dcUser = req.user;
    if (dcUser.role !== "DC") {
      return res.status(403).json({ message: "Access denied. DC only." });
    }
    const { mcId } = req.params;
    if (!mcId) {
      return res.status(400).json({
        message: "Mc id is required",
      });
    }
    const singleMc = await MCModel.findById(mcId);
    if (!singleMc) {
      return res.status(404).json({
        message: "Mc is not found",
      });
    }
    res.status(200).json({
      message: "Data fetched Successfully",
      data: singleMc,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server error",
    });
  }
};

const updateMcForDc = async (req, res) => {
  try {
    const { mcId } = req.params;
    const updates = req.body;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(mcId)) {
      return res.status(400).json({
        message: "Invalid MC ID",
      });
    }

    // Fields that are allowed to be updated by DC
    const allowedUpdates = [
      "name",
      "tehsilId",
      "cooId",
      "employeeIds",
      "zilaId",
    ];
    const requestedUpdates = Object.keys(updates);

    const isValidUpdate = requestedUpdates.every((update) =>
      allowedUpdates.includes(update)
    );

    if (!isValidUpdate) {
      return res.status(400).json({
        message: "Invalid fields provided for update",
      });
    }

    const updatedMC = await MCModel.findByIdAndUpdate(mcId, updates, {
      new: true,
      runValidators: true,
    })
      .populate("tehsilId", "name") // Optional: populate for better response
      .populate("zilaId", "name")
      .populate("cooId", "name email")
      .populate("employeeIds", "name email");

    if (!updatedMC) {
      return res.status(404).json({
        message: "MC not found",
      });
    }

    res.status(200).json({
      message: "MC updated successfully",
      data: updatedMC,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

module.exports = {
  createMC,
  deleteMc,
  getAllMcForDc,
  getMcByIdForDc,
  updateMcForDc,
};
