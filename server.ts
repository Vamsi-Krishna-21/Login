import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { app, connectAndSeed } from "./backend/app.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Initialize database and seed sample data
  await connectAndSeed();

  // Vite development middleware or Static asset serving in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      root: path.resolve(__dirname, "frontend"),
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development server mounted as Express middleware (root: frontend).");
  } else {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving compiled static assets from dist folder.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Full-stack server successfully running on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Critical error starting Express full-stack server:", error);
});
