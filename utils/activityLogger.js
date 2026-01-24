const Activity = require("../models/activityModel");
const User = require("../models/usersModel");
async function logActivity({
  action,
  performedBy,
  targetId,
  targetType,
  meta = {},
  role,
}) {
  await Activity.create({
    action,
    performedBy,
    targetId,
    targetType,
    meta,
    role: role || (await User.findById(performedBy))?.role,
  });
}

module.exports = {
  logActivity,
};
