module.exports = {
  PORT: Number(process.env.PORT) || 3000,

  DEFAULT_ENGINE: 'google',
  ENGINES: {
    google:     { name: 'Google',     url: 'https://www.google.com/search?q={q}&hl=en' },
    duckduckgo: { name: 'DuckDuckGo', url: 'https://html.duckduckgo.com/html/?q={q}' },
    bing:       { name: 'Bing',       url: 'https://www.bing.com/search?q={q}' }
  },

  SHORTCUTS: [
    { name: 'Click counter', url: 'https://www.rapidtables.com/tools/click-counter.html' },
    { name: 'Cookie Clicker', url: 'https://orteil.dashnet.org/cookieclicker/' },
    { name: 'CPS test', url: 'https://cpstest.org/' }
  ]
};
