import "dotenv/config";

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { generatePlanFromText } from "./openai-plan.js";
import { mockPlan } from "./mock-plan.js";
import { generateSvg } from "./svg-renderer.js";

const PORT = process.env.PORT || 3000;
server.listen(PORT)

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const publicDir = path.join(projectRoot, "public");

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8"
  });
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, text, contentType = "text/plain; charset=utf-8") {
  res.writeHead(statusCode, { "Content-Type": contentType });
  res.end(text);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";

    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 2_000_000) {
        reject(new Error("Body too large"));
        req.destroy();
      }
    });

    req.on("end", () => resolve(raw));
    req.on("error", reject);
  });
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".html") return "text/html; charset=utf-8";
  if (ext === ".css") return "text/css; charset=utf-8";
  if (ext === ".js") return "application/javascript; charset=utf-8";
  if (ext === ".json") return "application/json; charset=utf-8";
  if (ext === ".svg") return "image/svg+xml; charset=utf-8";

  return "application/octet-stream";
}

function serveStaticFile(res, filePath) {
  if (!fs.existsSync(filePath)) {
    return sendText(res, 404, "Not found");
  }

  const content = fs.readFileSync(filePath);
  res.writeHead(200, {
    "Content-Type": getContentType(filePath)
  });
  res.end(content);
}

const server = http.createServer(async (req, res) => {
  try {
    const host = req.headers.host || `localhost:${PORT}`;
    const url = new URL(req.url, `http://${host}`);

    console.log(`${req.method} ${url.pathname}`);

    if (req.method === "GET" && url.pathname === "/") {
      res.writeHead(302, { Location: "/editor" });
      return res.end();
    }

    if (req.method === "GET" && url.pathname === "/editor") {
      return serveStaticFile(res, path.join(publicDir, "editor.html"));
    }

    if (req.method === "GET" && url.pathname === "/preview") {
      const svg = generateSvg(mockPlan);
      return sendText(
        res,
        200,
        `
<!doctype html>
<html lang="uk">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Preview</title>
    <style>
      body {
        margin: 0;
        padding: 20px;
        background: #f1f5f9;
        font-family: Arial, sans-serif;
      }
      .card {
        background: #fff;
        border-radius: 16px;
        padding: 16px;
        box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
      }
      svg {
        max-width: 100%;
        height: auto;
        display: block;
      }
    </style>
  </head>
  <body>
    <div class="card">${svg}</div>
  </body>
</html>
        `.trim(),
        "text/html; charset=utf-8"
      );
    }

    if (req.method === "GET" && url.pathname === "/styles.css") {
      return serveStaticFile(res, path.join(publicDir, "styles.css"));
    }

    if (req.method === "GET" && url.pathname === "/app.js") {
      return serveStaticFile(res, path.join(publicDir, "app.js"));
    }

    if (req.method === "GET" && url.pathname === "/api/mock-plan") {
      return sendJson(res, 200, mockPlan);
    }

    if (req.method === "POST" && url.pathname === "/api/render-plan") {
      const raw = await readBody(req);
      const plan = JSON.parse(raw || "{}");
      const svg = generateSvg(plan);
      return sendJson(res, 200, { svg });
    }

    if (req.method === "POST" && url.pathname === "/api/generate-from-text") {
      const raw = await readBody(req);
      const body = JSON.parse(raw || "{}");
      const prompt = String(body.prompt || "").trim();

      if (!prompt) {
        return sendJson(res, 400, { error: "Порожній опис об'єкта" });
      }

      const plan = await generatePlanFromText(prompt);
      return sendJson(res, 200, { plan });
    }

    return sendText(res, 404, "Not found");
  } catch (error) {
    console.error("SERVER ERROR:", error);
    return sendJson(res, 500, {
      error: error.message || "Внутрішня помилка сервера"
    });
  }
});

server.listen(PORT, () => {
  console.log(`Server started: http://localhost:${PORT}/preview`);
  console.log(`Editor: http://localhost:${PORT}/editor`);
  console.log(`Public dir: ${publicDir}`);
});