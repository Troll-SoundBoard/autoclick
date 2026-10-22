// Local server: node server.js  ->  http://localhost:3000
const http = require('http');
const { TARGET_URL, PORT } = require('./config');
const handler = require('./lib/handler');

http.createServer(handler).listen(PORT, () =>
  console.log('Auto clicker ready: http://localhost:' + PORT + '  (loading ' + TARGET_URL + ')'));
