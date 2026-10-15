/**
 * Kasane Shell — local preview server
 *
 * Zero dependencies. Serves the repository root so the browser renders the
 * exact same index.html / styles.css / app.js that ship inside the APK.
 *
 * Usage:
 *   npm run dev            → http://localhost:5500
 *   PORT=8080 npm run dev
 *
 * Live reload: every HTML response gets a small injected client that polls
 * /__rev. When a file changes on disk the revision bumps and the page reloads.
 * The injection happens here, at serve time — index.html itself stays clean,
 * so nothing pollutes the shipped APK.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT) || 5500;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8'
};

let revision = 1;

const LIVE_CLIENT = `(function () {
  var seen = null;
  setInterval(function () {
    fetch('/__rev', { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (seen === null) { seen = d.rev; return; }
        if (d.rev !== seen) { location.reload(); }
      })
      .catch(function () {});
  }, 700);
})();`;

function watchRoot() {
  try {
    let timer = null;
    fs.watch(ROOT, { recursive: true }, (_event, filename) => {
      if (!filename) return;
      /* Ignore build output and VCS noise so we do not reload for nothing. */
      if (/^(node_modules|\.git|\.gradle|build)[\\/]/.test(filename)) return;
      clearTimeout(timer);
      timer = setTimeout(() => { revision++; }, 120);
    });
    return true;
  } catch (e) {
    return false;
  }
}

function send(res, status, headers, body) {
  res.writeHead(status, headers);
  res.end(body);
}

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);

  if (urlPath === '/__rev') {
    return send(res, 200, { 'Content-Type': MIME['.json'], 'Cache-Control': 'no-store' }, JSON.stringify({ rev: revision }));
  }

  if (urlPath === '/__live.js') {
    return send(res, 200, { 'Content-Type': MIME['.js'], 'Cache-Control': 'no-store' }, LIVE_CLIENT);
  }

  let target = urlPath === '/' ? '/index.html' : urlPath;
  const filePath = path.join(ROOT, target);

  /* Never serve anything outside the project root. */
  if (!filePath.startsWith(ROOT)) {
    return send(res, 403, { 'Content-Type': MIME['.txt'] }, 'Forbidden');
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      return send(res, 404, { 'Content-Type': MIME['.txt'] }, `404 Not found: ${target}`);
    }

    const ext = path.extname(filePath).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, data) => {
      if (readErr) {
        return send(res, 500, { 'Content-Type': MIME['.txt'] }, '500 Internal error');
      }

      /* Always revalidate so a refresh never shows a stale stylesheet. */
      const headers = { 'Content-Type': type, 'Cache-Control': 'no-store' };

      if (ext === '.html') {
        let html = data.toString('utf8');
        const injected = `<script src="/__live.js"></script>\n</body>`;
        html = html.includes('</body>') ? html.replace('</body>', injected) : html + injected;
        return send(res, 200, headers, html);
      }

      return send(res, 200, headers, data);
    });
  });
});

const watching = watchRoot();

server.listen(PORT, () => {
  console.log('');
  console.log('  🌸  KASANE SHELL — preview server');
  console.log(`      http://localhost:${PORT}`);
  console.log(`      root: ${ROOT}`);
  console.log(`      live reload: ${watching ? 'active' : 'unavailable (refresh manually)'}`);
  console.log('');
});
