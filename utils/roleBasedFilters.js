// utils/roleBasedFilters.js
const { getRoleId } = require("../utils/roleHelpers");

async function buildRoleBasedMatch(user, options = {}) {
  const { forUsers = false } = options;

  if (!user || !user.roleId) {
    throw new Error("User or roleId missing in buildRoleBasedMatch");
  }

  console.log("user.roleId.toString():", user.roleId.toString());

  // Await all role IDs
  const roleMap = {
    DC: await getRoleId("DC"),
    AC: await getRoleId("AC"),
    MC_CO: await getRoleId("MC_CO"),
    DISTRICT_COUNCIL_OFFICER: await getRoleId("DISTRICT_COUNCIL_OFFICER"),
  };

  const userRoleIdStr = user.roleId.toString();

  let match = {};

  if (userRoleIdStr === roleMap.DC?.toString()) {
    console.log("Matched DC role");
    return match; // {}
  }

  if (userRoleIdStr === roleMap.AC?.toString()) {
    if (!user.tehsilId) {
      throw new Error("AC user is missing tehsilId");
    }
    match.tehsilId = user.tehsilId;
    return match;
  }

  if (userRoleIdStr === roleMap.MC_CO?.toString()) {
    if (!user.mcId) {
      throw new Error("MC_CO user is missing mcId");
    }
    if (forUsers) {
      match.mcId = user.mcId;
    } else {
      match.mcId = user.mcId;
    }
    return match;
  }

  if (userRoleIdStr === roleMap.DISTRICT_COUNCIL_OFFICER?.toString()) {
    if (!user.districtCouncilId) {
      throw new Error("District Council Officer missing districtCouncilId");
    }
    if (forUsers) {
      match.districtCouncilId = user.districtCouncilId;
    } else {
      match.districtCouncilId = user.districtCouncilId;
    }
    return match;
  }

  throw new Error(`Role not supported in dashboard: ${userRoleIdStr}`);
}

module.exports = {
  buildRoleBasedMatch,
};
