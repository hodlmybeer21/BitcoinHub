import express from "express";
import { registerRoutes } from "../server/routes";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
// Serve the vite-built static files
app.use(express.static(path.join(__dirname, "..", "dist", "public")));

(async () => {
  const server = await registerRoutes(app);
  // SPA fallback for client routes
  app.get(/^\/(?!api).*/, (_req, res) => {
    res.sendFile(path.join(__dirname, "..", "dist", "public", "index.html"));
  });
  server.listen({ port: 5050, host: "127.0.0.1" }, () =>
    console.log("API + SPA on http://127.0.0.1:5050")
  );
})();
