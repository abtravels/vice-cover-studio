// Vice Cover Studio — local static server for trying the app.
// Serves app/ at http://localhost:8080, nothing else, no network needed.
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('./app/', import.meta.url));
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.ttf': 'font/ttf',
};

const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = join(root, path === '/' ? 'index.html' : path);
  if (!file.startsWith(root) || !existsSync(file)) {
    res.writeHead(404, { 'content-type': 'text/plain', 'cache-control': 'no-store' });
    res.end('not found');
    return;
  }
  // No-store while testing: the browser must never show a stale app after
  // an edit, and the app itself needs no cache to work offline.
  res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
  res.end(readFileSync(file));
});

server.listen(8080, () => console.log('Vice Cover Studio at http://localhost:8080'));
