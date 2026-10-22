import { Response } from "express";
import { Project } from "../models/Project.js";
import { Task } from "../models/Task.js";
import { AuthenticatedRequest } from "../middleware/auth.js";

export async function createProject(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { name, description, color } = req.body;
    if (!name) {
      res.status(400).json({ message: "Project name is required." });
      return;
    }

    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized." });
      return;
    }

    const project = await Project.create({
      name,
      description,
      color,
      ownerId: userId,
      status: "active",
    });

    res.status(201).json(project);
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to create project." });
  }
}

export async function getProjects(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized." });
      return;
    }

    const projects = await Project.find({ ownerId: userId }).sort({ createdAt: -1 });
    res.status(200).json(projects);
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to fetch projects." });
  }
}

export async function getProjectById(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const project = await Project.findById(id);
    if (!project) {
      res.status(404).json({ message: "Project not found." });
      return;
    }

    if (project.ownerId !== userId) {
      res.status(403).json({ message: "Access denied." });
      return;
    }

    res.status(200).json(project);
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to fetch project." });
  }
}

export async function updateProject(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { name, description, color, status } = req.body;

    const project = await Project.findById(id);
    if (!project) {
      res.status(404).json({ message: "Project not found." });
      return;
    }

    if (project.ownerId !== userId) {
      res.status(403).json({ message: "Access denied to update this project." });
      return;
    }

    const updated = await Project.findByIdAndUpdate(
      id,
      { name, description, color, status },
      { new: true }
    );

    res.status(200).json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to update project." });
  }
}

export async function deleteProject(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const project = await Project.findById(id);
    if (!project) {
      res.status(404).json({ message: "Project not found." });
      return;
    }

    if (project.ownerId !== userId) {
      res.status(403).json({ message: "Access denied to delete this project." });
      return;
    }

    await Project.findByIdAndDelete(id);

    // Delete all tasks under this project
    const projectTasks = await Task.find({ projectId: id });
    for (const task of projectTasks) {
      await Task.findByIdAndDelete(task._id);
    }

    res.status(200).json({ message: "Project and all associated tasks deleted successfully." });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to delete project." });
  }
}
