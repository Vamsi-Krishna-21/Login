import "./config/env.js";
import express from "express";
import cors from "cors";
import apiRouter from "./routes/api.js";
import { User } from "./models/User.js";
import { Project } from "./models/Project.js";
import { Task } from "./models/Task.js";
import { mongoose } from "./db/mongoose.js";
import { getMongoUri, isProduction } from "./config/env.js";

export const app = express();

// CORS configuration for separate frontend deployments
const clientOrigin = process.env.CLIENT_ORIGIN || process.env.FRONTEND_URL;
app.use(
  cors({
    origin: clientOrigin
      ? clientOrigin.includes(",")  
        ? clientOrigin.split(",").map((o) => o.trim())
        : clientOrigin
      : true, // Allow any origin if not explicitly restricted (essential for easy deployment)
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Standard parsers
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Health Check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "Workspace Dashboard Hub Backend API",
    time: new Date().toISOString(),
  });
});

// Mount API routes
app.use("/api", apiRouter);

export async function seedDatabase() {
  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log("Seeding initial demo data into mock MongoDB...");

      const demoUser = await User.create({
        name: "Demo Workspace User",
        username: "demouser",
        email: "demo@workspace.com",
        password: "demopassword123", // hashes automatically on pre-save
        avatar: "🚀",
        role: "member",
      });

      const demoProj1 = await Project.create({
        name: "🚀 Platform Onboarding",
        description: "Getting started and exploring the Workspace Dashboard Hub features.",
        color: "#2563eb",
        ownerId: demoUser._id,
        status: "active",
      });

      const demoProj2 = await Project.create({
        name: "💅 Styling Refinements",
        description: "Polishing user interfaces, hover animations, and dark components.",
        color: "#7c3aed",
        ownerId: demoUser._id,
        status: "active",
      });

      await Task.create({
        title: "Explore live text search",
        description: "Type search keywords in the search bar to filter tasks in real-time.",
        projectId: demoProj1._id,
        status: "todo",
        priority: "high",
        dueDate: new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0],
        ownerId: demoUser._id,
        assigneeId: demoUser._id,
      });

      await Task.create({
        title: "Create your first custom project",
        description: "Click the '+ New Project' button in the sidebar to define a workspace with custom tag colors.",
        projectId: demoProj1._id,
        status: "todo",
        priority: "medium",
        dueDate: new Date(Date.now() + 86400000 * 5).toISOString().split("T")[0],
        ownerId: demoUser._id,
        assigneeId: demoUser._id,
      });

      await Task.create({
        title: "Completed security setup controls",
        description: "Hashing passwords with high-salt rounds and generating JWT claims.",
        projectId: demoProj1._id,
        status: "completed",
        priority: "urgent",
        dueDate: new Date(Date.now() - 86400000).toISOString().split("T")[0],
        ownerId: demoUser._id,
        assigneeId: demoUser._id,
      });

      await Task.create({
        title: "Implement mobile touch targets",
        description: "Ensure cards and menus support at least 44px of visual tap area.",
        projectId: demoProj2._id,
        status: "in-progress",
        priority: "low",
        dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
        ownerId: demoUser._id,
        assigneeId: demoUser._id,
      });

      console.log("Seeding complete! You can log in with: demo@workspace.com / demopassword123");
    }
  } catch (err) {
    console.error("Failed to seed database on startup:", err);
  }
}

export async function connectAndSeed() {
  const mongoUri = getMongoUri();
  await mongoose.connect(mongoUri);
  if (!isProduction() || process.env.SEED_DATABASE === "true") {
    await seedDatabase();
  }
}
