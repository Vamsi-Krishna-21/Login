import { mongoose } from "../db/mongoose.js";

const ProjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  color: { type: String, default: "#3b82f6" },
  ownerId: { type: String, required: true },
  status: { type: String, default: "active" }, // active, archived, completed
});

export const Project = mongoose.model("Project", ProjectSchema);
