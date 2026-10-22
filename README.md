# Auto clicker

Loads the site set in `config.js` as a real page (no iframe) and adds a floating auto-clicker panel.

## Run

    node server.js          # or: npm start

Then open http://localhost:3000. Needs Node 18 or newer. Nothing to install.

## Change the site

Edit `TARGET_URL` in `config.js`, then restart. You can also set it for one run:

    TARGET_URL="https://example.com" node server.js

## Folder structure

    autoclicker/
    ├── README.md
    ├── package.json
    ├── config.js              URL and port
    ├── server.js              fetches the site, injects the panel
    └── src/
        └── client/
            ├── clicker.js     click engine, hotkey, readout
            ├── panel.html     panel markup
            └── panel.css      panel styles

The client files are read on every page load, so you can edit them and just refresh.

## Notes

- Sites that load their own data from their servers may break, since the page is served from localhost.
- Links you click leave the clicker and go to the real site.
- Clicks are script-generated; some sites ignore them.
