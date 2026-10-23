// /  the home page: search bar, engine picker, site tiles.
const fs = require('fs');
const path = require('path');
const config = require('../config');

const SRC = path.join(__dirname, '..', 'src');

module.exports = function home(req, res) {
  const data = JSON.stringify({
    engines: config.ENGINES, defaultEngine: config.DEFAULT_ENGINE, shortcuts: config.SHORTCUTS
  }).replace(/</g, '\\u003c');
  const search = fs.readFileSync(path.join(SRC, 'shared', 'search.js'), 'utf8');
  const html = fs.readFileSync(path.join(SRC, 'home', 'home.html'), 'utf8')
    .replace('/*__DATA__*/{}', () => data)
    .replace('/*__SEARCH__*/', () => search);
  res.statusCode = 200;
  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(html);
};
