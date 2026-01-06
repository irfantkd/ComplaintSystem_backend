const Role = require("../models/roleModels")

/**
 * Ensure single role document exists
 */
const getRoleDoc = async () => {
  let doc = await Role.findOne();
  if (!doc) {
    doc = await Role.create({ roles: [] });
  }
  return doc;
};

/**
 * GET all roles
 */
const getRoles = async (req, res) => {
  try {
    const doc = await getRoleDoc();
    res.status(200).json({
      message: "Roles fetched successfully",
      roles: doc.roles,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * CREATE role
 */
const createRole = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Role name is required" });
    }

    const doc = await getRoleDoc();

    const alreadyExists = doc.roles.some(
      r => r.name.toLowerCase() === name.toLowerCase()
    );

    if (alreadyExists) {
      return res.status(400).json({ message: "Role already exists" });
    }

    doc.roles.push({ name: name.trim() });
    await doc.save();

    res.status(201).json({
      message: "Role created successfully",
      roles: doc.roles,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * UPDATE role
 */
const updateRole = async (req, res) => {
  try {
    const { roleId } = req.params;
    const { name, isActive } = req.body;

    const doc = await getRoleDoc();
    const role = doc.roles.id(roleId);

    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    if (name) role.name = name.trim();
    if (isActive !== undefined) role.isActive = isActive;

    await doc.save();

    res.status(200).json({
      message: "Role updated successfully",
      role,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * DELETE role (soft delete)
 */
const deleteRole = async (req, res) => {
  try {
    const { roleId } = req.params;

    const doc = await getRoleDoc();
    const role = doc.roles.id(roleId);

    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    role.isActive = false;
    await doc.save();

    res.status(200).json({
      message: "Role deleted (deactivated) successfully",
      role,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getRoles,
  createRole,
  updateRole,
  deleteRole,
};
