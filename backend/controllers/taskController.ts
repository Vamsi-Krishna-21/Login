import { Response } from "express";
import { Task } from "../models/Task.js";
import { Project } from "../models/Project.js";
import { AuthenticatedRequest } from "../middleware/auth.js";

export async function createTask(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { title, description, projectId, status, priority, dueDate, assigneeId } = req.body;
    const userId = req.user?.id;

    if (!title || !projectId) {
      res.status(400).json({ message: "Task title and Project ID are required." });
      return;
    }

    if (!userId) {
      res.status(401).json({ message: "Unauthorized." });
      return;
    }

    // Verify project belongs to user
    const project = await Project.findById(projectId);
    if (!project) {
      res.status(404).json({ message: "Project not found." });
      return;
    }

    if (project.ownerId !== userId) {
      res.status(403).json({ message: "Cannot add task to a project you don't own." });
      return;
    }

    const task = await Task.create({
      title,
      description,
      projectId,
      status: status || "todo",
      priority: priority || "medium",
      dueDate,
      assigneeId: assigneeId || userId,
      ownerId: userId,
    });

    res.status(201).json(task);
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to create task." });
  }
}

export async function getTasks(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized." });
      return;
    }

    const { projectId, status, priority, search, sortBy, page = "1", limit = "10" } = req.query;

    const queryConditions: any = { ownerId: userId };

    if (projectId) {
      queryConditions.projectId = projectId;
    }
    if (status) {
      queryConditions.status = status;
    }
    if (priority) {
      queryConditions.priority = priority;
    }

    // Add search conditions
    if (search && typeof search === "string" && search.trim() !== "") {
      const escapedSearch = search.trim();
      queryConditions.$or = [
        { title: { $regex: escapedSearch, $options: "i" } },
        { description: { $regex: escapedSearch, $options: "i" } }
      ];
    }

    // Sorting definition
    let sortCriteria: any = { createdAt: -1 };
    if (sortBy === "dueDate") {
      sortCriteria = { dueDate: 1 };
    } else if (sortBy === "priority") {
      sortCriteria = { priority: -1 };
    } else if (sortBy === "title") {
      sortCriteria = { title: 1 };
    }

    // Count before pagination
    const totalTasks = await Task.countDocuments(queryConditions);

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 10;
    const skipNum = (pageNum - 1) * limitNum;

    // Execute query with skip and limit
    const tasks = await Task.find(queryConditions)
      .sort(sortCriteria)
      .skip(skipNum)
      .limit(limitNum)
      .exec();

    const totalPages = Math.ceil(totalTasks / limitNum) || 1;

    res.status(200).json({
      tasks,
      pagination: {
        totalTasks,
        totalPages,
        currentPage: pageNum,
        limit: limitNum,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to fetch tasks." });
  }
}

export async function getTaskById(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const task = await Task.findById(id);
    if (!task) {
      res.status(404).json({ message: "Task not found." });
      return;
    }

    if (task.ownerId !== userId) {
      res.status(403).json({ message: "Access denied." });
      return;
    }

    res.status(200).json(task);
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to fetch task." });
  }
}

export async function updateTask(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { title, description, projectId, status, priority, dueDate, assigneeId } = req.body;

    const task = await Task.findById(id);
    if (!task) {
      res.status(404).json({ message: "Task not found." });
      return;
    }

    if (task.ownerId !== userId) {
      res.status(403).json({ message: "Access denied to update this task." });
      return;
    }

    // If changing projects, check ownership of new project
    if (projectId && projectId !== task.projectId) {
      const project = await Project.findById(projectId);
      if (!project || project.ownerId !== userId) {
        res.status(403).json({ message: "Cannot move task to a project you don't own." });
        return;
      }
    }

    const updated = await Task.findByIdAndUpdate(
      id,
      { title, description, projectId, status, priority, dueDate, assigneeId },
      { new: true }
    );

    res.status(200).json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to update task." });
  }
}

export async function deleteTask(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const task = await Task.findById(id);
    if (!task) {
      res.status(404).json({ message: "Task not found." });
      return;
    }

    if (task.ownerId !== userId) {
      res.status(403).json({ message: "Access denied to delete this task." });
      return;
    }

    await Task.findByIdAndDelete(id);
    res.status(200).json({ message: "Task deleted successfully." });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to delete task." });
  }
}
