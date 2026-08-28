const fs = require("fs");
const path = require("path");

function makeStore(fileName) {
  const file = path.join(__dirname, "..", "data", fileName);
  function read() {
    try { return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : []; } catch { return []; }
  }
  function write(items) { fs.writeFileSync(file, JSON.stringify(items.slice(0, 500), null, 2)); }
  return { all: () => read(), add: (item) => { const items = read(); items.unshift(item); write(items); return item; }, update: (id, changes) => { const items = read(); const item = items.find((entry) => entry.id === id); if (!item) return null; Object.assign(item, changes); write(items); return item; } };
}

module.exports = { makeStore };