const express = require("express");
const cors = require("cors");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const server = http.createServer(app); // This is the correct http server
require("dotenv").config();
const PORT = process.env.PORT || 3001;

const connectDb = require("./config/Database");
const complainCategoryRoutes = require("./Routes/ComplainCategoryRoutes");
const rolesRoutes = require("./Routes/RoleRoutes");
const authRoutes = require("./Routes/authRoutes");
const USERRoutes = require("./Routes/VolunteerRoutes");
const dcRoutes = require("./Routes/dcRoutes");
const tehsilRoutes = require("./Routes/tehsilRoute");
const districtCouncilRoutes = require("./Routes/DistrictCouncilRoutes");
const AcRoutes = require("./Routes/ACRoutes");
const districtCouncilUserRoutes = require("./Routes/districtCouncilUserRoutes");
const mcCooRoutes = require("./Routes/mcCooRoutes");
const employeeRoutes = require("./Routes/employeeRoutes");
const complaintRoutes = require("./Routes/complaintRoutes");
const notificationRoutes = require("./Routes/notificationRoutes");

const io = new Server(server, {
  cors: {
    origin: ["http://192.168.1.60:3000", "http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.set("io", io);

// Middleware
app.use(cors());
app.use(express.json());

connectDb();

app.use("/api", districtCouncilUserRoutes);
app.use("/api", mcCooRoutes);
app.use("/api", authRoutes);
app.use("/api", USERRoutes);
app.use("/api", tehsilRoutes);
app.use("/api", districtCouncilRoutes);
app.use("/api", AcRoutes);
app.use("/api", rolesRoutes);
app.use("/api", complainCategoryRoutes);
app.use("/api", employeeRoutes);
app.use("/api", dcRoutes);
app.use("/api", complaintRoutes);
app.use("/api", notificationRoutes);

// Basic socket connection handling
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Client should send their userId when they connect
  socket.on("register", (userId) => {
    if (userId) {
      // Join a room named after their userId
      socket.join(userId.toString());
      console.log(`User ${userId} joined their personal room`);
    }
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Socket.IO ready at: ${PORT}`);
});
