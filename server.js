// Local server: node server.js  ->  http://localhost:3000
const http = require('http');
const { PORT } = require('./config');
const home = require('./lib/home');
const browse = require('./lib/browse');
const proxy = require('./lib/proxy');

const routes = { '/': home, '/b': browse, '/__p': proxy };

http.createServer((req, res) => {
  const handler = routes[new URL(req.url, 'http://x').pathname];
  if (!handler) { res.statusCode = 404; return res.end('Not found'); }
  handler(req, res);
}).listen(PORT, () => console.log('Auto clicker browser ready: http://localhost:' + PORT));
