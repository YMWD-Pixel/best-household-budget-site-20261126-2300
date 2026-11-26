// Tiny static server for local testing: serves app/ at http://localhost:8080.
// Usage: node serve.ts [--port 8080]

import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, extname, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("./app", import.meta.url)));
const args = process.argv.slice(2);
const portIndex = args.indexOf("--port");
const port = portIndex === -1 ? 8080 : Number(args[portIndex + 1]) || 8080;

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
};

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  let path = normalize(join(root, decodeURIComponent(url.pathname)));
  if (!path.startsWith(root + sep) && path !== root) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  if (path === root || path.endsWith(sep)) path = join(path, "index.html");
  if (!existsSync(path) || !statSync(path).isFile()) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }
  res.writeHead(200, { "content-type": types[extname(path)] ?? "application/octet-stream" });
  res.end(readFileSync(path));
});

server.listen(port, () => {
  console.log(`NestEgg at http://localhost:${port}/`);
});
