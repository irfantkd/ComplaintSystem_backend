const Tehsil = require('../models/tehsilModel');
const User = require('../models/usersModel');
const Zila = require('../models/zilaModel');
const MC = require('../models/MCModel');
const Role = require('../models/roleModels');
const { paginate } = require("../utils/pagination");



/**
 * Helper: Get roleId by role name
 */
const getRoleId = async (roleName) => {
  const roleConfig = await Role.findOne();
  if (!roleConfig) throw new Error('RoleConfig not found');
  const role = roleConfig.roles.find(r => r.name === roleName);
  if (!role) throw new Error(`Role "${roleName}" not found`);
  return role._id.toString();
};

/**
 * Create a new Tehsil (Only DC can create)
 */
const createTehsil = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const dcRoleId = await getRoleId('DC');

    if (!user || user.roleId.toString() !== dcRoleId) {
      return res.status(403).json({ message: "Only DC can create a Tehsil" });
    }

    const { name, zilaId, acId } = req.body;

    if (!name || !zilaId) {
      return res.status(400).json({ message: "Tehsil name and Zila ID are required" });
    }

    const zilaExists = await Zila.findById(zilaId);
    if (!zilaExists) return res.status(404).json({ message: "Zila not found" });

    const existingTehsil = await Tehsil.findOne({ name, zilaId });
    if (existingTehsil) return res.status(400).json({ message: "Tehsil with this name already exists in this Zila" });

    if (acId) {
      const acUser = await User.findById(acId);
      const acRoleId = await getRoleId('AC');
      if (!acUser) return res.status(404).json({ message: "AC user not found" });
      if (acUser.roleId.toString() !== acRoleId) return res.status(400).json({ message: "Assigned user must have AC role" });
    }

    const tehsil = await Tehsil.create({ name, zilaId, acId: acId || undefined });

    res.status(201).json({
      message: "Tehsil created successfully",
      tehsil: {
        id: tehsil._id,
        name: tehsil.name,
        zilaId: tehsil.zilaId,
        acId: tehsil.acId,
        createdAt: tehsil.createdAt,
      },
    });
  } catch (error) {
    console.error("Create Tehsil Error:", error.message);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

/**
 * Get all Tehsils
 */


const getAllTehsils = async (req, res) => {
  try {
    const { zilaId, search, page = 1, limit = 10 } = req.query;

    // Build query object
    let query = {};
    if (zilaId) query.zilaId = zilaId;
    if (search?.trim()) query.name = new RegExp(search.trim(), "i");

    // Use the reusable paginate function
    const result = await paginate({
      query,
      model: Tehsil,
      page,
      limit,
      sort: { createdAt: -1 },
      populate: [
        { path: "zilaId", select: "name" },
        { path: "acId", select: "name username roleId" },
        { path: "mcId", select: "name" },
      ],
    });

    res.status(200).json({
      message: "Tehsils fetched successfully",
      count: result.pagination.totalItems,
      tehsils: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("Get All Tehsils Error:", error.message);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};



/**
 * Get single Tehsil by ID
 */
const getTehsilById = async (req, res) => {
  try {
    const { id } = req.params;

    const tehsil = await Tehsil.findById(id)
      .populate('zilaId', 'name')
      .populate('acId', 'name username roleId')
      .populate('mcId', 'name');

    if (!tehsil) return res.status(404).json({ message: "Tehsil not found" });

    res.status(200).json({ message: "Tehsil fetched successfully", tehsil });
  } catch (error) {
    console.error("Get Tehsil By ID Error:", error.message);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

/**
 * Update Tehsil (Only DC can update)
 */
const updateTehsil = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const dcRoleId = await getRoleId('DC');
    if (!user || user.roleId.toString() !== dcRoleId) return res.status(403).json({ message: "Only DC can update a Tehsil" });

    const { id } = req.params;
    const { name, acId, mcId } = req.body;

    const tehsil = await Tehsil.findById(id);
    if (!tehsil) return res.status(404).json({ message: "Tehsil not found" });

    // Update name
    if (name) {
      const existingTehsil = await Tehsil.findOne({ name, zilaId: tehsil.zilaId, _id: { $ne: id } });
      if (existingTehsil) return res.status(400).json({ message: "Tehsil with this name already exists in this Zila" });
      tehsil.name = name;
    }

    // Update AC
    if (acId !== undefined) {
      if (!acId) {
        tehsil.acId = undefined;
      } else {
        const acUser = await User.findById(acId);
        const acRoleId = await getRoleId('AC');
        if (!acUser) return res.status(404).json({ message: "AC user not found" });
        if (acUser.roleId.toString() !== acRoleId) return res.status(400).json({ message: "Assigned user must have AC role" });
        tehsil.acId = acId;
      }
    }

    // Update MC
    if (mcId !== undefined) {
      if (!mcId) {
        tehsil.mcId = undefined;
      } else {
        const mc = await MC.findById(mcId);
        if (!mc) return res.status(404).json({ message: "MC not found" });
        if (mc.tehsilId.toString() !== id) return res.status(400).json({ message: "MC must belong to this Tehsil" });
        tehsil.mcId = mcId;
      }
    }

    await tehsil.save();

    const updatedTehsil = await Tehsil.findById(id)
      .populate('zilaId', 'name')
      .populate('acId', 'name username roleId')
      .populate('mcId', 'name');

    res.status(200).json({ message: "Tehsil updated successfully", tehsil: updatedTehsil });
  } catch (error) {
    console.error("Update Tehsil Error:", error.message);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

/**
 * Delete Tehsil (Only DC can delete)
 */
const deleteTehsil = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const dcRoleId = await getRoleId('DC');
    if (!user || user.roleId.toString() !== dcRoleId) return res.status(403).json({ message: "Only DC can delete a Tehsil" });

    const { id } = req.params;
    const tehsil = await Tehsil.findById(id);
    if (!tehsil) return res.status(404).json({ message: "Tehsil not found" });

    const associatedUsers = await User.countDocuments({ tehsilId: id });
    const associatedMCs = await MC.countDocuments({ tehsilId: id });

    if (associatedUsers > 0 || associatedMCs > 0) {
      return res.status(400).json({
        message: `Cannot delete Tehsil. It has ${associatedUsers} associated users and ${associatedMCs} MCs`,
      });
    }

    await Tehsil.findByIdAndDelete(id);

    res.status(200).json({ message: "Tehsil deleted successfully", deletedTehsil: { id: tehsil._id, name: tehsil.name } });
  } catch (error) {
    console.error("Delete Tehsil Error:", error.message);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

/**
 * Get all Zilas (Helper function)
 */
const getAllZilas = async (req, res) => {
  try {
    const zilas = await Zila.find().sort({ name: 1 });
    if (!zilas || zilas.length === 0) return res.status(404).json({ message: "No Zilas found" });

    res.status(200).json({ message: "Successfully retrieved Zilas", count: zilas.length, data: zilas });
  } catch (error) {
    console.error("Get Zilas Error:", error.message);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

module.exports = {
  createTehsil,
  getAllTehsils,
  getTehsilById,
  updateTehsil,
  deleteTehsil,
  getAllZilas,
};
