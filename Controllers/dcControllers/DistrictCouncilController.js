const DistrictCouncil = require("../../models/DistrictCouncilModel");
const User = require("../../models/usersModel");
const Zila = require("../../models/zilaModel");



const getRoleId = async (roleName) => {
  const roleConfig = await Role.findOne();
  if (!roleConfig) throw new Error('RoleConfig not found');
  const role = roleConfig.roles.find(r => r.name === roleName);
  if (!role) throw new Error(`Role "${roleName}" not found`);
  return role._id.toString();
};


/**
 * Create a new District Council (Only DC can create)
 * Only name and zilaId are required - Officer is assigned separately
 */
const createDistrictCouncil = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const dcRoleId = await getRoleId("DC");

    if (!user || user.roleId.toString() !== dcRoleId) {
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

    const zilaExists = await Zila.findById(zilaId);
    if (!zilaExists) {
      return res.status(404).json({ message: "Zila not found" });
    }

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
      districtCouncil,
    });
  } catch (error) {
    console.error("Create District Council Error:", error.message);
    res.status(500).json({ message: "Server Error", error: error.message });
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
      .populate("zilaId", "name")
      .populate("officerId", "name username role")
      .populate("employeeIds", "name username role")
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
      .populate("zilaId", "name")
      .populate("officerId", "name username role")
      .populate("employeeIds", "name username role");

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
    const dcRoleId = await getRoleId("DC");

    if (!user || user.roleId.toString() !== dcRoleId) {
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

    districtCouncil.name = name;
    await districtCouncil.save();

    const updatedCouncil = await DistrictCouncil.findById(id)
      .populate("zilaId", "name")
      .populate("officerId", "name username role")
      .populate("employeeIds", "name username role");

    res.status(200).json({
      message: "District Council updated successfully",
      districtCouncil,
    });
  } catch (error) {
    console.error("Update District Council Error:", error.message);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

/**
 * Delete District Council (Only DC can delete)
 */
const deleteDistrictCouncil = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const dcRoleId = await getRoleId("DC");

    if (!user || user.roleId.toString() !== dcRoleId) {
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
      deletedCouncil: districtCouncil._id,
    });
  } catch (error) {
    console.error("Delete District Council Error:", error.message);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};


/**
 * Assign Officer to District Council
 */
const assignOfficerToCouncil = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const dcRoleId = await getRoleId("DC");
    const officerRoleId = await getRoleId("DISTRICT_COUNCIL_OFFICER");

    if (!user || user.roleId.toString() !== dcRoleId) {
      return res.status(403).json({
        message: "Only DC can assign Officer",
      });
    }

    const { councilId } = req.params;
    const { officerId } = req.body;

    const districtCouncil = await DistrictCouncil.findById(councilId);
    if (!districtCouncil) {
      return res.status(404).json({ message: "District Council not found" });
    }

    const officer = await User.findById(officerId);
    if (!officer || officer.roleId.toString() !== officerRoleId) {
      return res.status(400).json({
        message: "User must have District Council Officer role",
      });
    }

    districtCouncil.officerId = officerId;
    await districtCouncil.save();

    res.status(200).json({
      message: "Officer assigned successfully",
      districtCouncil,
    });
  } catch (error) {
    console.error("Assign Officer Error:", error.message);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};


/**
 * Add Employee to District Council
 */
const addEmployeeToCouncil = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const dcRoleId = await getRoleId("DC");

    if (!user || user.roleId.toString() !== dcRoleId) {
      return res.status(403).json({
        message: "Only DC can add Employee",
      });
    }

    const { councilId } = req.params;
    const { employeeId } = req.body;

    const districtCouncil = await DistrictCouncil.findById(councilId);
    if (!districtCouncil) {
      return res.status(404).json({ message: "District Council not found" });
    }

    if (districtCouncil.employeeIds.includes(employeeId)) {
      return res.status(400).json({
        message: "Employee already added",
      });
    }

    districtCouncil.employeeIds.push(employeeId);
    await districtCouncil.save();

    const updatedCouncil = await DistrictCouncil.findById(councilId).populate(
      "employeeIds",
      "name username role"
    );

    res.status(200).json({
      message: "Employee added successfully",
      districtCouncil,
    });
  } catch (error) {
    console.error("Add Employee Error:", error.message);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};


/**
 * Remove Employee from District Council
 */
const removeEmployeeFromCouncil = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const dcRoleId = await getRoleId("DC");

    if (!user || user.roleId.toString() !== dcRoleId) {
      return res.status(403).json({
        message: "Only DC can remove Employee",
      });
    }

    const { councilId, employeeId } = req.params;

    const districtCouncil = await DistrictCouncil.findById(councilId);
    if (!districtCouncil) {
      return res.status(404).json({ message: "District Council not found" });
    }

    districtCouncil.employeeIds = districtCouncil.employeeIds.filter(
      id => id.toString() !== employeeId
    );

    await districtCouncil.save();

    const updatedCouncil = await DistrictCouncil.findById(councilId).populate(
      "employeeIds",
      "name username role"
    );

    res.status(200).json({
      message: "Employee removed successfully",
      districtCouncil,
    });
  } catch (error) {
    console.error("Remove Employee Error:", error.message);
    res.status(500).json({ message: "Server Error", error: error.message });
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
