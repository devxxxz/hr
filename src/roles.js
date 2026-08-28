const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const ROLE_FILE = path.join(__dirname, "..", "data", "roles.json");

const XP_RANKS = [
  [0, "Newborn"], [100, "Initiate"], [300, "Operator"], [750, "Analyst"],
  [1500, "Specialist"], [3000, "Researcher"], [6000, "Sentinel"], [10000, "Vanguard"],
  [20000, "Elite"], [35000, "Shadow"], [50000, "ShadowByte"], [75000, "Black Ops"], [100000, "Apex"],
];

const PERMISSIONS = ["dashboard", "users", "roles", "security", "moderation", "content", "developer", "api", "threats", "audit", "system"];
const ROLE_SEEDS = [
  ["Founder", "Leadership", "diamond", ["*"], 100], ["Co-Founder", "Leadership", "orbit", ["dashboard", "users", "roles", "security", "audit", "system"], 90],
  ["Executive", "Leadership", "crown", ["dashboard", "users", "security", "audit"], 80], ["Director", "Leadership", "flag", ["dashboard", "users", "security", "audit"], 70],
  ["Administrator", "Administration", "shield", ["dashboard", "users", "moderation", "content", "audit"], 60], ["Security Lead", "Administration", "lock", ["dashboard", "security", "threats", "audit"], 55], ["Developer Lead", "Administration", "code", ["dashboard", "developer", "api", "audit"], 50],
  ["Senior Developer", "Engineering", "terminal", ["dashboard", "developer", "api"], 40], ["Developer", "Engineering", "brackets", ["dashboard", "developer"], 30], ["Threat Researcher", "Engineering", "radar", ["dashboard", "threats", "security"], 35],
  ["Core Team", "Prestige", "spark", ["dashboard"], 25], ["Security Council", "Prestige", "shield", ["dashboard", "security"], 24], ["Research Council", "Prestige", "radar", ["dashboard", "threats"], 23], ["Engineering Team", "Prestige", "code", ["dashboard", "developer"], 22], ["Threat Intelligence", "Prestige", "eye", ["dashboard", "threats"], 21], ["Beta Tester", "Prestige", "flask", ["dashboard"], 15], ["Verified Researcher", "Prestige", "badge", ["dashboard", "threats"], 20], ["Contributor", "Prestige", "plus", ["dashboard", "content"], 12], ["Community Partner", "Prestige", "users", ["dashboard"], 11], ["Project Ambassador", "Prestige", "megaphone", ["dashboard"], 10], ["Early Supporter", "Prestige", "bolt", ["dashboard"], 8], ["OG Member", "Prestige", "star", ["dashboard"], 7], ["Veteran", "Prestige", "award", ["dashboard"], 6], ["Elite Member", "Prestige", "crown", ["dashboard"], 5],
];

let customRoles = [];
function seedRoles() {
  if (customRoles.length) return;
  try { customRoles = JSON.parse(fs.readFileSync(ROLE_FILE, "utf8")); } catch { customRoles = []; }
  if (!customRoles.length) { customRoles = ROLE_SEEDS.map(([name, department, icon, permissions, level], index) => ({ id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), name, department, icon, permissions, level, description: `${name} clearance within the ShadowByte network.`, enabled: true, position: index })); saveRoles(); }
}
function saveRoles() { fs.writeFileSync(ROLE_FILE, JSON.stringify(customRoles, null, 2)); }
seedRoles();

function allRoles() { return customRoles.slice(); }
function getRole(name) {
  const aliases = { owner: "Founder", admin: "Administrator", member: "Community Partner" };
  const normalized = aliases[String(name || "").toLowerCase()] || name;
  return customRoles.find((role) => role.name.toLowerCase() === String(normalized).toLowerCase()) || customRoles.find((role) => role.id === normalized);
}
function rankForXp(xp = 0) { return XP_RANKS.reduce((current, rank) => xp >= rank[0] ? { name: rank[1], min: rank[0] } : current, { name: "Newborn", min: 0 }); }
function nextRank(xp = 0) { return XP_RANKS.find((rank) => rank[0] > xp) || null; }
function can(actor, permission) { const role = getRole(actor.role); return !!role && (role.permissions.includes("*") || role.permissions.includes(permission)); }
function canManage(actor, targetRole) { if (actor && actor.role === "owner") return true; const actorRole = getRole(actor && actor.role); return !!actorRole && actorRole.level > (targetRole && targetRole.level || 0); }
function createRole(data) { const role = { id: crypto.randomUUID(), name: data.name, department: data.department || "Custom", icon: data.icon || "spark", permissions: data.permissions || ["dashboard"], level: Number(data.level) || 1, description: data.description || "Custom ShadowByte role.", enabled: data.enabled !== false, position: customRoles.length }; customRoles.push(role); saveRoles(); return role; }
function updateRole(id, changes) { const role = customRoles.find((item) => item.id === id); if (!role) return null; Object.assign(role, changes, { level: Number(changes.level ?? role.level) }); saveRoles(); return role; }
function deleteRole(id) { const role = customRoles.find((item) => item.id === id); if (!role || ROLE_SEEDS.some((seed) => seed[0].toLowerCase().replace(/[^a-z0-9]+/g, "-") === id)) throw new Error("Seed roles cannot be deleted."); customRoles = customRoles.filter((item) => item.id !== id); saveRoles(); return role; }

module.exports = { XP_RANKS, PERMISSIONS, seedRoles, allRoles, getRole, rankForXp, nextRank, can, canManage, createRole, updateRole, deleteRole };