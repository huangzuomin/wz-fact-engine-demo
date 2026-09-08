// 本地静态服务：模拟 /fact/<ID> 干净 URL（目录型 index.html）
const http = require('http');
const fs = require('fs');
const path = require('path');
const SITE = path.join(__dirname, '..', 'site');
const PORT = process.env.PORT || 8010;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};

http.createServer((req, res) => {
  let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  if (urlPath.endsWith('/')) urlPath += 'index.html';
  let fp = path.join(SITE, urlPath);
  if (!fp.startsWith(SITE)) { res.writeHead(403); return res.end('forbidden'); }
  const stat = fs.existsSync(fp) ? fs.statSync(fp) : null;
  if (!stat) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('404 Not Found: ' + urlPath);
  }
  if (stat.isDirectory()) fp = path.join(fp, 'index.html');
  const ext = path.extname(fp).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
}).listen(PORT, () => console.log('fact engine serving at http://127.0.0.1:' + PORT + '/fact/'));
