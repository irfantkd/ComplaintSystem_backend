// controllers/complaintController.js

const Complaint = require("../../models/complaintModel");
const { paginate } = require("../../utils/pagination");
const bcrypt = require("bcryptjs");
const userModel = require("../../models/usersModel");
const zillaModel = require("../../models/zilaModel");
const tehsilModel = require("../../models/tehsilModel");

const createUser = async (req, res) => {
  try {
    const {
      name,
      username,
      password,
      role,
      districtId,
      tehsilId,
      mcId,
    } = req.body;

    // 1️⃣ Basic validation
    if (!name || !username || !password || !role) {
      return res.status(400).json({
        message: "Missing required fields",
      });
    }

    
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({
        message: "Username already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    
    const newUser = await User.create({
      name,
      username,
      password: hashedPassword,
      role,
      districtId: districtId ? districtId: null,
      
      tehsilId: tehsilId ? tehsilId : null,
      mcId: mcId ?mcId:null,
    });

    
    res.status(201).json({
      message: "User created successfully",
      user: {
        id: newUser._id,
        name: newUser.name,
        username: newUser.username,
        hashedPassword,
        role: newUser.role,
        districtId: newUser.districtId,
        tehsilId: newUser.tehsilId,
        mcId: newUser.mcId,
      },
    });
  } catch (error) {
    console.error("Create User Error:", error.message);
    res.status(500).json({
      message: error.message || "Server error",
    });
  }
};

const getComplaintsForDC = async (req, res) => {
  try {
    const dcUser = req.user;
    console.log(dcUser)

    if (dcUser.role !== "DC") {
      return res.status(403).json({ message: "Access denied. DC only." });
    }

    // Query parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const {
      search, // Search in title or description
      status, // e.g., SUBMITTED, IN_PROGRESS, RESOLVED
      categoryId, // Filter by category
      startDate, // YYYY-MM-DD
      endDate, // YYYY-MM-DD
    } = req.query;

    // Build dynamic query
    let query = { zilaId: dcUser.zilaId };

    // 1. Text Search (title or description)
    if (search && search.trim() !== "") {
      const searchRegex = new RegExp(search.trim(), "i"); // case-insensitive
      query.$or = [{ title: searchRegex }, { description: searchRegex }];
    }

    // 2. Filter by status
    if (status && status !== "ALL") {
      query.status = status;
    }

    // 3. Filter by category
    if (categoryId && categoryId !== "") {
      query.categoryId = categoryId;
    }

    // 4. Date range filter (createdAt)
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate); // Greater than or equal
      }
      if (endDate) {
        // Set end of day for endDate
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }
    // Important: Only mark filtered results as seen if they were unseen
    const updateResult = await Complaint.updateMany(
      {
        ...query, // Apply same filters
        seen: false,
      },
      { $set: { seen: true, updatedAt: new Date() } }
    );

    // Then: Fetch paginated + filtered results
    const result = await paginate({
      query,
      model: Complaint,
      page,
      limit,
      sort: { createdAt: -1 },
      populate: [
        { path: "createdByVolunteerId", select: "name username" },
        { path: "categoryId", select: "name" },
      ],
    });

    res.status(200).json({
      message: "Complaints fetched successfully",
      filtersApplied: {
        search: search || null,
        status: status || null,
        categoryId: categoryId || null,
        dateRange: startDate || endDate ? { startDate, endDate } : null,
      },
      unseenMarkedAsSeen: updateResult.modifiedCount,
      ...result, // data + pagination
    });
  } catch (error) {
    console.error("Error fetching complaints for DC:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

const deleteComplaintForDc = async (req, res) => {
  try {
    const dcUser = req.user;
    if (dcUser.role !== "DC") {
      return res.status(403).json({ message: "Access denied. DC only." });
    }
    const { complaintId } = req.params;
    if(!complaintId){
      return res.status(400).json({ message: "Complaint ID is required." });
    }
    const complaint = await Complaint.findById(complaintId);
    if(!complaint){
      return res.status(404).json({ message: "Complaint not found." });
    }
    if(complaint.zilaId.toString() !== dcUser.zilaId.toString()){
      return res.status(403).json({ message: "Access denied. DC only." });
    }

    const deletedComplaint = await Complaint.findByIdAndDelete(complaintId);
    if (!deletedComplaint) {
      return res.status(404).json({ message: "Complaint not found." });
    }
    res.status(200).json({
      message: "Complaint deleted successfully",
      complaint: deletedComplaint,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server error",
    });
  }
};

const updateStatusForDc = async (req, res) => {
  try {
    const dcUser = req.user;
console.log(dcUser,"from the update status")
    if (dcUser.role !== "DC") {
      return res.status(403).json({ message: "Access denied. DC only." });
    }

    const { complaintId } = req.params;
    const { status } = req.body;

    // Validate status against allowed values
    const allowedStatuses = [
      "SUBMITTED",
      "ASSIGNED",
      "FORWARDED_TO_MC",
      "ASSIGNED_TO_EMPLOYEE",
      "IN_PROGRESS",
      "RESOLVED",
      "COMPLETED",
      "DELAYED",
      "REJECTED",
    ];

    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid or missing status. Must be one of: " + allowedStatuses.join(", "),
      });
    }

    // First: Find the complaint AND check ownership in one query
    const complaint = await Complaint.findOne({
      _id: complaintId,
      zilaId: dcUser.zilaId, // Critical: restrict to DC's district
    });
    console.log(complaint,'complain that dc will update')

    if (!complaint) {
      return res.status(404).json({
        message: "Complaint not found or you don't have access to it.",
      });
    }

    // Now safely update
    complaint.status = status;

    await complaint.save();

    res.status(200).json({
      message: "Complaint status updated successfully",
      complaint,
    });
  } catch (error) {
    console.error("Error updating complaint status:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

const updateUserStatusForDC = async (req, res) => {
  try {
    const dcUser = req.user;

    // 1. Only allow DC role
    if (dcUser.role !== "DC") {
      return res.status(403).json({ message: "Access denied. Only DC can update user status." });
    }

    const { userId } = req.params;
    const { isActive } = req.body; // Expect boolean: true or false

    // 2. Validate input
    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        message: "Invalid request. 'isActive' must be true or false.",
      });
    }

    // 3. Find user AND ensure they belong to the same zila as the DC
    const user = await userModel.findOne({
      _id: userId,
      zilaId: dcUser.zilaId, // Critical security check
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found or does not belong to your district.",
      });
    }

    // Optional: Prevent DC from deactivating themselves
    if (user._id.toString() === dcUser._id.toString()) {
      return res.status(400).json({
        message: "You cannot deactivate your own account.",
      });
    }

    // 4. Update status
    user.isActive = isActive;
    await user.save();

    res.status(200).json({
      message: "User status updated successfully",
      user: {
        _id: user._id,
        name: user.name,
        username: user.username,
        role: user.role,
        isActive: user.isActive,
        zilaId: user.zilaId,
      },
    });
  } catch (error) {
    console.error("Error updating user status:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const dcUser = req.user;

    // Only DC can access
    if (dcUser.role !== "DC") {
      return res.status(403).json({ message: "Access denied. DC only." });
    }

    // Query parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const { search, role, isActive } = req.query;

    // Base query: users in the same district as DC
    let query = { zilaId: dcUser.zilaId,_id: { $ne: dcUser._id } };

    // 1. Search by name or username (case-insensitive)
    if (search && search.trim() !== "") {
      const searchRegex = new RegExp(search.trim(), "i");
      query.$or = [
        { name: searchRegex },
        { username: searchRegex }
      ];
    }

    // 2. Filter by role
    if (role && role !== "ALL") {
      query.role = role;
    }

    // 3. Filter by active status (true/false)
    if (isActive !== undefined && isActive !== "") {
      // Accept "true"/"false" as string or boolean
      query.isActive = isActive === "true" || isActive === true;
    }

    // Use your reusable paginate function
    const result = await paginate({
      query,
      model: userModel,
      page,
      limit,
      sort: { createdAt: -1 }, // newest first
      populate: [], // add if you want to populate zila, tehsil, etc.
    });

    res.status(200).json({
      message: "Users fetched successfully",
      filtersApplied: {
        search: search || null,
        role: role || null,
        isActive: isActive !== undefined ? (isActive === "true" || isActive === true) : null,
      },
      ...result, // contains data + pagination
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

const updateUserDetails =async(req,res)=>{
  try {
    const dcUser = req.user;
    if (dcUser.role !== "DC") {
      return res.status(403).json({ message: "Access denied. DC only." });
    }

    const {userId} = req.params
    const {name,username,password,role,zilaId,tehsilId,mcId} = req.body
    const user = await userModel.findById(userId);
    if(!user){
      return res.status(404).json({message:"User not found"})
    }
    user.name = name || user.name
    user.username = username || user.username
    user.password = password || user.password
    user.role = role || user.role
    user.zilaId = zilaId || user.zilaId
    user.tehsilId = tehsilId || user.tehsilId
    user.mcId = mcId || user.mcId
    await user.save()
    res.status(200).json({message:"User updated successfully",user})
  } catch (error) {
    console.error(error)
    res.status(500).json({message:"Server error"})
  } 
}

module.exports = { getComplaintsForDC, deleteComplaintForDc,updateStatusForDc,updateUserStatusForDC,getAllUsers,updateUserDetails ,createUser};
