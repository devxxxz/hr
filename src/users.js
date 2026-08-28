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
<<<<<<< HEAD
    // don't overwrite the hash here — if the owner changed their password
    // in the dashboard, data/users.json is the source of truth from then on.
=======
    // keep hash in sync with .env in case it was rotated
    existing.passwordHash = ownerHash;
>>>>>>> a77ef059e85bdaf13eadf2dd59f745d0221b2dad
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
<<<<<<< HEAD
  return loadUsers().map(({ id, username, displayName, role, secondaryRoles, xp, reputation, department, badges, verified, contributions, createdAt, avatarUrl, theme, accent, density, motion }) => ({
    id,
    username,
    displayName: displayName || username.split("@")[0],
    role,
    secondaryRoles: secondaryRoles || [], xp: xp || 0, reputation: reputation || 0, department: department || "Community", badges: badges || [], verified: !!verified, contributions: contributions || 0,
    createdAt,
    avatarUrl: avatarUrl || "",
    theme: theme || "hacker", accent: accent || "", density: density || "comfortable", motion: motion !== false,
  }));
}

function publicProfile(user) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName || user.username.split("@")[0],
    role: user.role,
    secondaryRoles: user.secondaryRoles || [], xp: user.xp || 0, reputation: user.reputation || 0, department: user.department || "Community", badges: user.badges || [], verified: !!user.verified, contributions: user.contributions || 0, createdAt: user.createdAt,
    avatarUrl: user.avatarUrl || "",
    theme: user.theme || "hacker", accent: user.accent || "", density: user.density || "comfortable", motion: user.motion !== false,
  };
}

=======
  return loadUsers().map(({ id, username, role, createdAt }) => ({
    id,
    username,
    role,
    createdAt,
  }));
}

>>>>>>> a77ef059e85bdaf13eadf2dd59f745d0221b2dad
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
<<<<<<< HEAD
    displayName: username.split("@")[0], xp: 0, reputation: 0, department: "Community", badges: [], verified: false, contributions: 0,
=======
>>>>>>> a77ef059e85bdaf13eadf2dd59f745d0221b2dad
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  saveUsers(users);
  return user;
}

<<<<<<< HEAD
=======
function updateUser(id, changes) {
  const users = loadUsers();
  const user = users.find((u) => u.id === id);
  if (!user) return null;
  Object.assign(user, changes);
  saveUsers(users);
  return user;
}

>>>>>>> a77ef059e85bdaf13eadf2dd59f745d0221b2dad
function removeUser(id) {
  const users = loadUsers();
  const target = users.find((u) => u.id === id);
  if (!target) return false;
  if (target.role === "owner") throw new Error("Cannot remove the owner account.");
  saveUsers(users.filter((u) => u.id !== id));
  return true;
}

<<<<<<< HEAD
function updatePassword(id, passwordHash) {
  const users = loadUsers();
  const target = users.find((u) => u.id === id);
  if (!target) throw new Error("User not found.");
  target.passwordHash = passwordHash;
  saveUsers(users);
  return target;
}

function updateProfile(id, changes) {
  const users = loadUsers();
  const target = users.find((u) => u.id === id);
  if (!target) throw new Error("User not found.");
  if (typeof changes.avatarUrl === "string") target.avatarUrl = changes.avatarUrl;
  if (typeof changes.theme === "string") target.theme = changes.theme;
  if (typeof changes.role === "string") target.role = changes.role;
  if (typeof changes.accent === "string") target.accent = changes.accent;
  if (["comfortable", "compact"].includes(changes.density)) target.density = changes.density;
  if (typeof changes.motion === "boolean") target.motion = changes.motion;
  saveUsers(users);
  return target;
}

=======
>>>>>>> a77ef059e85bdaf13eadf2dd59f745d0221b2dad
module.exports = {
  seedOwner,
  findByUsername,
  findById,
  listPublic,
  addUser,
  removeUser,
<<<<<<< HEAD
  updatePassword,
  updateProfile,
  publicProfile,
=======
>>>>>>> a77ef059e85bdaf13eadf2dd59f745d0221b2dad
};
