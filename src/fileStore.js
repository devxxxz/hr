const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(__dirname, "..", "data", "files.json");

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

function add(entry) {
  const list = load();
  list.unshift(entry);
  save(list);
  return entry;
}

function remove(id) {
  const list = load();
  const target = list.find((f) => f.id === id);
  if (!target) return null;
  save(list.filter((f) => f.id !== id));
  return target;
}

function all() {
  return load();
}

function get(id) {
  return load().find((f) => f.id === id);
}

module.exports = { add, remove, all, get };
