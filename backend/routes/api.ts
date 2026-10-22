import { Router } from "express";
import { register, login, getMe, updateProfile, forgotPassword, resetPassword, getDashboard, requestEmailChange, verifyEmailChange, requestPasswordChange, verifyPasswordChange } from "../controllers/authController.js";
import { createProject, getProjects, getProjectById, updateProject, deleteProject } from "../controllers/projectController.js";
import { createTask, getTasks, getTaskById, updateTask, deleteTask } from "../controllers/taskController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

// Auth Routes
router.post("/auth/register", register);
router.post("/auth/login", login);
router.get("/auth/me", authMiddleware as any, getMe as any);
router.put("/auth/profile", authMiddleware as any, updateProfile as any);
router.post("/auth/request-email-change", authMiddleware as any, requestEmailChange as any);
router.post("/auth/verify-email-change", authMiddleware as any, verifyEmailChange as any);
router.post("/auth/request-password-change", authMiddleware as any, requestPasswordChange as any);
router.post("/auth/verify-password-change", authMiddleware as any, verifyPasswordChange as any);
router.post("/auth/forgot-password", forgotPassword);
router.post("/auth/reset-password/:token", resetPassword);

// Dashboard Route
router.get("/dashboard", authMiddleware as any, getDashboard as any);

// Project Routes
router.post("/projects", authMiddleware as any, createProject as any);
router.get("/projects", authMiddleware as any, getProjects as any);
router.get("/projects/:id", authMiddleware as any, getProjectById as any);
router.put("/projects/:id", authMiddleware as any, updateProject as any);
router.delete("/projects/:id", authMiddleware as any, deleteProject as any);

// Task Routes
router.post("/tasks", authMiddleware as any, createTask as any);
router.get("/tasks", authMiddleware as any, getTasks as any);
router.get("/tasks/:id", authMiddleware as any, getTaskById as any);
router.put("/tasks/:id", authMiddleware as any, updateTask as any);
router.delete("/tasks/:id", authMiddleware as any, deleteTask as any);

export default router;
