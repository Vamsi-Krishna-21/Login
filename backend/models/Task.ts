import { mongoose } from "../db/mongoose.js";

const TaskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  projectId: { type: String, required: true },
  status: { type: String, default: "todo" }, // backlog, todo, in-progress, completed
  priority: { type: String, default: "medium" }, // low, medium, high, urgent
  dueDate: { type: String },
  assigneeId: { type: String },
  ownerId: { type: String, required: true },
});

export const Task = mongoose.model("Task", TaskSchema);
