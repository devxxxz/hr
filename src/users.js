const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DATA_FILE = path.join(__dirname, "..", "data", "users.json");

function loadUsers() {
  if (!fs.existsSync(DATA_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function saveUsers(users) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2));
}

function seedOwner() {
  const users = loadUsers();
  const ownerUsername = process.env.OWNER_USERNAME;
  const ownerHash = process.env.OWNER_PASSWORD_HASH;
  if (!ownerUsername || !ownerHash) {
    console.error("Missing OWNER_USERNAME / OWNER_PASSWORD_HASH in .env");
    process.exit(1);
  }

  const existing = users.find((u) => u.username === ownerUsername);
  if (existing) {
    // keep hash in sync with .env in case it was rotated
    existing.passwordHash = ownerHash;
    existing.role = "owner";
  } else {
    users.push({
      id: crypto.randomUUID(),
      username: ownerUsername,
      passwordHash: ownerHash,
      role: "owner",
      createdAt: new Date().toISOString(),
    });
  }
  saveUsers(users);
}

function findByUsername(username) {
  return loadUsers().find((u) => u.username === username);
}

function findById(id) {
  return loadUsers().find((u) => u.id === id);
}

function listPublic() {
  return loadUsers().map(({ id, username, role, createdAt }) => ({
    id,
    username,
    role,
    createdAt,
  }));
}

function addUser({ username, passwordHash, role }) {
  const users = loadUsers();
  if (users.find((u) => u.username === username)) {
    throw new Error("Username already exists.");
  }
  const user = {
    id: crypto.randomUUID(),
    username,
    passwordHash,
    role,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  saveUsers(users);
  return user;
}

function removeUser(id) {
  const users = loadUsers();
  const target = users.find((u) => u.id === id);
  if (!target) return false;
  if (target.role === "owner") throw new Error("Cannot remove the owner account.");
  saveUsers(users.filter((u) => u.id !== id));
  return true;
}

module.exports = {
  seedOwner,
  findByUsername,
  findById,
  listPublic,
  addUser,
  removeUser,
};
