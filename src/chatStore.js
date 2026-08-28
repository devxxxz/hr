const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(__dirname, "..", "data", "chat.json");
const MAX_HISTORY = 200;

function load() {
  if (!fs.existsSync(DATA_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function save(list) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2));
}

function addMessage(msg) {
  const list = load();
  list.push(msg);
  while (list.length > MAX_HISTORY) list.shift();
  save(list);
  return msg;
}

function recent(limit = 50) {
  const list = load();
  return list.slice(-limit);
}

module.exports = { addMessage, recent };
