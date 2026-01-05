const DistrictCouncil = require('../models/DistrictCouncilModel');
const User = require('../models/usersModel');
const Zila = require('../models/zilaModel');

/**
 * Create a new District Council (Only DC can create)
 * Only name and zilaId are required - Officer is assigned separately
 */
const createDistrictCouncil = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== "DC") {
      return res.status(403).json({
        message: "Only DC can create a District Council",
      });
    }

    const { name, zilaId } = req.body;

    if (!name || !zilaId) {
      return res.status(400).json({
        message: "District Council name and Zila ID are required",
      });
    }

    // Verify Zila exists
    const zilaExists = await Zila.findById(zilaId);
    if (!zilaExists) {
      return res.status(404).json({
        message: "Zila not found",
      });
    }

    // Check if District Council already exists for this Zila
    const existingCouncil = await DistrictCouncil.findOne({ zilaId });
    if (existingCouncil) {
      return res.status(400).json({
        message: "District Council already exists for this Zila",
      });
    }

    const districtCouncil = await DistrictCouncil.create({
      name,
      zilaId,
      employeeIds: [],
    });

    res.status(201).json({
      message: "District Council created successfully",
      districtCouncil: {
        id: districtCouncil._id,
        name: districtCouncil.name,
        zilaId: districtCouncil.zilaId,
      },
    });
  } catch (error) {
    console.error("Create District Council Error:", error.message);
    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};

/**
 * Get all District Councils (with optional filters)
 */
const getAllDistrictCouncils = async (req, res) => {
  try {
    const { zilaId } = req.query;
    let query = {};

    // Filter by Zila
    if (zilaId) {
      query.zilaId = zilaId;
    }

    const districtCouncils = await DistrictCouncil.find(query)
      .populate('zilaId', 'name')
      .populate('officerId', 'name username role')
      .populate('employeeIds', 'name username role')
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "District Councils fetched successfully",
      count: districtCouncils.length,
      districtCouncils,
    });
  } catch (error) {
    console.error("Get All District Councils Error:", error.message);
    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};

/**
 * Get single District Council by ID
 */
const getDistrictCouncilById = async (req, res) => {
  try {
    const { id } = req.params;

    const districtCouncil = await DistrictCouncil.findById(id)
      .populate('zilaId', 'name')
      .populate('officerId', 'name username role')
      .populate('employeeIds', 'name username role');

    if (!districtCouncil) {
      return res.status(404).json({
        message: "District Council not found",
      });
    }

    res.status(200).json({
      message: "District Council fetched successfully",
      districtCouncil,
    });
  } catch (error) {
    console.error("Get District Council By ID Error:", error.message);
    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};


/**
 * Update District Council (Only DC can update)
 */
const updateDistrictCouncil = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== "DC") {
      return res.status(403).json({
        message: "Only DC can update a District Council",
      });
    }

    const { id } = req.params;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        message: "District Council name is required",
      });
    }

    const districtCouncil = await DistrictCouncil.findById(id);
    if (!districtCouncil) {
      return res.status(404).json({
        message: "District Council not found",
      });
    }

    // Update name only
    districtCouncil.name = name;
    await districtCouncil.save();

    const updatedCouncil = await DistrictCouncil.findById(id)
      .populate('zilaId', 'name')
      .populate('officerId', 'name username role')
      .populate('employeeIds', 'name username role');

    res.status(200).json({
      message: "District Council updated successfully",
      districtCouncil: updatedCouncil,
    });
  } catch (error) {
    console.error("Update District Council Error:", error.message);
    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};


/**
 * Delete District Council (Only DC can delete)
 */
const deleteDistrictCouncil = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== "DC") {
      return res.status(403).json({
        message: "Only DC can delete a District Council",
      });
    }

    const { id } = req.params;

    const districtCouncil = await DistrictCouncil.findById(id);
    if (!districtCouncil) {
      return res.status(404).json({
        message: "District Council not found",
      });
    }

    await DistrictCouncil.findByIdAndDelete(id);

    res.status(200).json({
      message: "District Council deleted successfully",
      deletedCouncil: {
        id: districtCouncil._id,
        zilaId: districtCouncil.zilaId,
      },
    });
  } catch (error) {
    console.error("Delete District Council Error:", error.message);
    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};

/**
 * Assign Officer to District Council
 */
const assignOfficerToCouncil = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== "DC") {
      return res.status(403).json({
        message: "Only DC can assign Officer to District Council",
      });
    }

    const { councilId } = req.params;
    const { officerId } = req.body;

    if (!officerId) {
      return res.status(400).json({
        message: "Officer ID is required",
      });
    }

    const districtCouncil = await DistrictCouncil.findById(councilId);
    if (!districtCouncil) {
      return res.status(404).json({
        message: "District Council not found",
      });
    }

    const officer = await User.findById(officerId);
    if (!officer) {
      return res.status(404).json({
        message: "Officer user not found",
      });
    }

    if (officer.role !== "DISTRICT_COUNCIL_OFFICER") {
      return res.status(400).json({
        message: "User must have DISTRICT_COUNCIL_OFFICER role",
      });
    }

    districtCouncil.officerId = officerId;
    await districtCouncil.save();

    res.status(200).json({
      message: "Officer assigned to District Council successfully",
      districtCouncil: {
        id: districtCouncil._id,
        zilaId: districtCouncil.zilaId,
        officerId: districtCouncil.officerId,
      },
    });
  } catch (error) {
    console.error("Assign Officer Error:", error.message);
    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};

/**
 * Add Employee to District Council
 */
const addEmployeeToCouncil = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== "DC") {
      return res.status(403).json({
        message: "Only DC can add Employee to District Council",
      });
    }

    const { councilId } = req.params;
    const { employeeId } = req.body;

    if (!employeeId) {
      return res.status(400).json({
        message: "Employee ID is required",
      });
    }

    const districtCouncil = await DistrictCouncil.findById(councilId);
    if (!districtCouncil) {
      return res.status(404).json({
        message: "District Council not found",
      });
    }

    const employee = await User.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        message: "Employee user not found",
      });
    }

    // Check if employee is already in the list
    if (districtCouncil.employeeIds.includes(employeeId)) {
      return res.status(400).json({
        message: "Employee already added to this District Council",
      });
    }

    districtCouncil.employeeIds.push(employeeId);
    await districtCouncil.save();

    const updatedCouncil = await DistrictCouncil.findById(councilId)
      .populate('employeeIds', 'name username role');

    res.status(200).json({
      message: "Employee added to District Council successfully",
      districtCouncil: {
        id: updatedCouncil._id,
        employeeIds: updatedCouncil.employeeIds,
      },
    });
  } catch (error) {
    console.error("Add Employee Error:", error.message);
    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};

/**
 * Remove Employee from District Council
 */
const removeEmployeeFromCouncil = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== "DC") {
      return res.status(403).json({
        message: "Only DC can remove Employee from District Council",
      });
    }

    const { councilId, employeeId } = req.params;

    const districtCouncil = await DistrictCouncil.findById(councilId);
    if (!districtCouncil) {
      return res.status(404).json({
        message: "District Council not found",
      });
    }

    // Check if employee exists in the list
    if (!districtCouncil.employeeIds.includes(employeeId)) {
      return res.status(400).json({
        message: "Employee not found in this District Council",
      });
    }

    districtCouncil.employeeIds = districtCouncil.employeeIds.filter(
      (id) => id.toString() !== employeeId
    );
    await districtCouncil.save();

    const updatedCouncil = await DistrictCouncil.findById(councilId)
      .populate('employeeIds', 'name username role');

    res.status(200).json({
      message: "Employee removed from District Council successfully",
      districtCouncil: {
        id: updatedCouncil._id,
        employeeIds: updatedCouncil.employeeIds,
      },
    });
  } catch (error) {
    console.error("Remove Employee Error:", error.message);
    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};

module.exports = {
  createDistrictCouncil,
  getAllDistrictCouncils,
  getDistrictCouncilById,
  updateDistrictCouncil,
  deleteDistrictCouncil,
  assignOfficerToCouncil,
  addEmployeeToCouncil,
  removeEmployeeFromCouncil,
};