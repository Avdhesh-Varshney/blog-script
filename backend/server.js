import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import connectDB from "./config/db.js";
import router from "./Routes/index.js";
import { initCronJobs } from "./utils/cron.js";

dotenv.config();

const server = express();
const PORT = process.env.PORT || 8000;

// Middleware
server.use(express.json());
server.use(cors());

// Connect to Database
connectDB();

// Routes
server.get("/", (req, res) => res.send("Backend is running..."));
server.use("/api", router);

// Initialize cron jobs
initCronJobs(server);

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
