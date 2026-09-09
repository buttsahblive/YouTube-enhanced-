import path from "path";
import express from "express";
import app from "./api/index";

const PORT = 3000;

// Vite middleware or static serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`YouTube Enhanced Server listening on http://0.0.0.0:${PORT}`);
  });
}

// In local dev and Cloud Run containers, run the full Express server.
// In Vercel serverless environments, Vercel executes /api/index.ts directly.
if (!process.env.VERCEL) {
  startServer();
}

export default app;
