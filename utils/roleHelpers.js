const Role = require("../models/roleModels");

let roleNameCache = null;
let roleIdCache = null;
/**
 * Load role configuration once and cache both name → id and id → name mappings
 */
async function loadRoleCache() {
  if (roleNameCache && roleIdCache) return;
  const config = await Role.findOne().lean();
  if (!config) {
    throw new Error("Role configuration document not found in database");
  }
  roleNameCache = {};
  roleIdCache = {};
  config.roles.forEach((role) => {
    const idStr = role._id.toString();
    roleNameCache[idStr] = role.name;
    roleIdCache[role.name] = idStr;
  });
}
/**
 * Get role name from role ID (cached)
 * @param {string|ObjectId} roleId
 * @returns {Promise<string|null>}
 */
async function getRoleNameById(roleId) {
  await loadRoleCache();
  const idStr = roleId?.toString?.() || roleId;
  return roleNameCache[idStr] || null;
}
/**
 * Get role ID from role name (cached)
 * @param {string} roleName
 * @returns {Promise<string|null>}
 */
async function getRoleId(roleName) {
  await loadRoleCache();
  return roleIdCache[roleName] || null;
}
/**
 * Get multiple role IDs at once
 * @param {string[]} roleNames
 * @returns {Promise<string[]>}
 */
async function getRoleIds(roleNames) {
  await loadRoleCache();
  return roleNames
    .map((name) => roleIdCache[name])
    .filter((id) => id !== undefined && id !== null);
}
module.exports = {
  loadRoleCache,
  getRoleNameById,
  getRoleId,
  getRoleIds,
};
