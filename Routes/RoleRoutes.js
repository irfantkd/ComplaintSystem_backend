const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");

const {
  getRoles,
  createRole,
  updateRole,
  deleteRole,
} = require('../Controllers/RolesController')

// READ
router.get("/get-roles", authMiddleware, getRoles);

// CREATE
router.post("/create-roles", createRole);

// UPDATE
router.patch("/update-roles/:roleId", authMiddleware, updateRole);

// DELETE
router.delete("/delete-roles/:roleId", authMiddleware, deleteRole);

module.exports = router;
