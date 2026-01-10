const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();
const PORT = process.env.PORT || 3000;

const connectDb = require("./config/Database");
const complainCategoryRoutes = require("./Routes/ComplainCategoryRoutes");
const rolesRoutes = require("./Routes/RoleRoutes");
const authRoutes = require("./Routes/authRoutes");
const volunteerRoutes = require("./Routes/VolunteerRoutes");
const dcRoutes = require("./Routes/dcRoutes");
const tehsilRoutes = require("./Routes/tehsilRoute");
const districtCouncilRoutes = require("./Routes/DistrictCouncilRoutes");
const AcRoutes = require("./Routes/ACRoutes");
const districtCouncilUserRoutes = require("./Routes/districtCouncilUserRoutes");
const mcCooRoutes = require("./Routes/mcCooRoutes");
const employeeRoutes = require("./Routes/employeeRoutes");

// Middleware
app.use(cors());
app.use(express.json());

connectDb();

app.use("/api", districtCouncilUserRoutes);
app.use("/api", mcCooRoutes);

app.use("/api", dcRoutes);
app.use("/api", authRoutes);
app.use("/api", volunteerRoutes);
app.use("/api", tehsilRoutes);
app.use("/api", districtCouncilRoutes);
app.use("/api", AcRoutes);
app.use("/api", rolesRoutes);
app.use("/api", complainCategoryRoutes);
app.use("/api", employeeRoutes);

app.listen(PORT, "0.0.0.0", () => {
  console.log("Server is running...");
});
