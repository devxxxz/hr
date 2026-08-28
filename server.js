require("dotenv").config();
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const http = require("http");
const { Server } = require("socket.io");

const users = require("./src/users");
const fileStore = require("./src/fileStore");
const chatStore = require("./src/chatStore");
const { requireAuth, requireRole, requirePermission } = require("./src/middleware");
const roles = require("./src/roles");
const { makeStore } = require("./src/activityStore");
const auditStore = makeStore("audit.json");
const requestStore = makeStore("role-requests.json");
const notificationStore = makeStore("notifications.json");
function recordAudit(entry) { return auditStore.add({ id: crypto.randomUUID(), ...entry, ip: entry.ip || "session:" + "unknown", timestamp: entry.timestamp || new Date().toISOString(), result: entry.result || "success" }); }


users.seedOwner();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const UPLOAD_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const AVATAR_DIR = path.join(UPLOAD_DIR, "avatars");
if (!fs.existsSync(AVATAR_DIR)) fs.mkdirSync(AVATAR_DIR, { recursive: true });

app.set("trust proxy", 1);


app.set("trust proxy", 1); // needed for secure cookies behind a reverse proxy (e.g. nginx)
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || "hr-" + crypto.randomBytes(24).toString("hex"),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 8,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.FORCE_HTTPS === "true",
  },
});
app.use(sessionMiddleware);
io.engine.use(sessionMiddleware);

// ---------------- brute-force throttle ----------------
const attempts = new Map();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 10 * 60 * 1000;
function throttled(ip) {
  const rec = attempts.get(ip);
  if (!rec) return false;
  if (Date.now() - rec.first > WINDOW_MS) {
    attempts.delete(ip);
    return false;
  }
  return rec.count >= MAX_ATTEMPTS;
}
function registerFailure(ip) {
  const rec = attempts.get(ip);
  if (!rec) attempts.set(ip, { count: 1, first: Date.now() });
  else rec.count += 1;
}

// ---------------- pages ----------------
app.get("/", (req, res) => {
  if (req.session.user) return res.redirect("/dashboard");
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.get("/dashboard", (req, res) => {
  if (!req.session.user) return res.redirect("/");
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

// ---------------- auth API ----------------
app.post("/api/login", async (req, res) => {
  const ip = req.ip;
  if (throttled(ip)) {
    return res.status(429).json({ ok: false, message: "Too many attempts. Try again later." });
  }

  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ ok: false, message: "Username and password required." });
  }

  const user = users.findByUsername(username);
  const validPass = user && (await bcrypt.compare(password, user.passwordHash));

  if (!user || !validPass) {
    registerFailure(ip);
    return res.status(401).json({ ok: false, message: "Invalid credentials." });
  }

  attempts.delete(ip);
  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ ok: false, message: "Session error." });
    req.session.user = { id: user.id, username: user.username, role: user.role };
    res.json({ ok: true, redirect: "/dashboard" });
  });
});

app.get("/api/me", requireAuth, (req, res) => {
  const user = users.findById(req.session.user.id);
  if (!user) return res.status(404).json({ ok: false, message: "User not found." });
  req.session.user = { ...req.session.user, ...users.publicProfile(user) };
  res.json({ ok: true, user: req.session.user });
});

app.get("/api/control-center", requirePermission("dashboard"), (req, res) => {
  const user = users.findById(req.session.user.id);
  const publicUsers = users.listPublic();
  const ranked = publicUsers.sort((a, b) => (b.xp + b.reputation) - (a.xp + a.reputation)).map((item, index) => ({ ...item, position: index + 1, rank: roles.rankForXp(item.xp).name }));
  res.json({ ok: true, user: users.publicProfile(user), roles: roles.allRoles(), permissions: roles.PERMISSIONS, xpRanks: roles.XP_RANKS, members: publicUsers, leaderboard: ranked, audit: auditStore.all().slice(0, 20) });
});

app.get("/api/role-requests", requireAuth, (req, res) => {
  const canReview = roles.can(req.session.user, "users");
  const requests = requestStore.all();
  const publicRoles = roles.allRoles().filter((role) => role.enabled && role.department !== "Leadership" && role.department !== "Administration" && !role.permissions.some((permission) => ["users", "roles", "system"].includes(permission)));
  res.json({ ok: true, requests: canReview ? requests : requests.filter((request) => request.userId === req.session.user.id), roles: publicRoles });
});
app.get("/api/notifications", requireAuth, (req, res) => res.json({ ok: true, notifications: notificationStore.all().filter((item) => item.userId === req.session.user.id) }));
app.post("/api/role-requests", requireAuth, (req, res) => {
  const requestedRole = roles.getRole(req.body.roleId || req.body.role);
  if (!requestedRole || !requestedRole.enabled) return res.status(400).json({ ok: false, message: "Choose an available role." });
  if (requestStore.all().some((request) => request.userId === req.session.user.id && request.roleId === requestedRole.id && request.status === "pending")) return res.status(409).json({ ok: false, message: "You already have a pending request for this role." });
  const request = { id: crypto.randomUUID(), userId: req.session.user.id, username: req.session.user.username, roleId: requestedRole.id, role: requestedRole.name, reason: String(req.body.reason || "").trim().slice(0, 500), status: "pending", createdAt: new Date().toISOString() };
  if (!request.reason) return res.status(400).json({ ok: false, message: "Add a short reason for the request." });
  requestStore.add(request); recordAudit({ actor: req.session.user.username, action: "submitted role request", target: requestedRole.name, reason: request.reason, ip: req.ip }); res.json({ ok: true, request });
});
app.patch("/api/role-requests/:id", requirePermission("users"), (req, res) => {
  const request = requestStore.all().find((item) => item.id === req.params.id); const targetUser = request && users.findById(request.userId); const requestedRole = request && roles.getRole(request.roleId);
  if (!request || !targetUser) return res.status(404).json({ ok: false, message: "Request not found." });
  if (!["approved", "rejected"].includes(req.body.status)) return res.status(400).json({ ok: false, message: "Invalid request decision." });
  const isProjectOwner = req.session.user.username === process.env.OWNER_USERNAME && req.session.user.role === "owner";
  if (!isProjectOwner && (!roles.canManage(req.session.user, requestedRole) || (roles.getRole(targetUser.role) && !roles.canManage(req.session.user, roles.getRole(targetUser.role))))) return res.status(403).json({ ok: false, message: "You cannot approve a role at or above your clearance." });
  request.status = req.body.status; request.reviewedBy = req.session.user.username; request.reviewedAt = new Date().toISOString(); requestStore.update(request.id, request);
  if (request.status === "approved" && requestedRole) { const previousRole = targetUser.role; users.updateProfile(targetUser.id, { role: requestedRole.name }); recordAudit({ actor: req.session.user.username, target: targetUser.username, action: "approved role request", previousRole, newRole: requestedRole.name, reason: request.reason }); }
  else recordAudit({ actor: req.session.user.username, target: targetUser.username, action: "rejected role request", reason: request.reason });
  notificationStore.add({ id: crypto.randomUUID(), userId: targetUser.id, type: "role-request", title: request.status === "approved" ? "Role request approved" : "Role request rejected", message: request.status === "approved" ? `You are now ${request.role}.` : `Your request for ${request.role} was rejected.`, createdAt: new Date().toISOString(), read: false });
  res.json({ ok: true, request });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ ok: true, redirect: "/" });
  });
});

app.post("/api/me/password", requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ ok: false, message: "Current and new password required." });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ ok: false, message: "New password must be at least 6 characters." });
    }
    const user = users.findById(req.session.user.id);
    if (!user) return res.status(404).json({ ok: false, message: "User not found." });
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) return res.status(401).json({ ok: false, message: "Current password is incorrect." });

    const newHash = await bcrypt.hash(newPassword, 10);
    users.updatePassword(user.id, newHash);
    res.json({ ok: true, message: "Password updated." });
  } catch (err) {
    res.status(400).json({ ok: false, message: err.message });
  }
});

const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: AVATAR_DIR,
    filename: (req, file, cb) => cb(null, `${req.session.user.id}-${crypto.randomUUID()}${path.extname(file.originalname).slice(0, 10)}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Profile photo must be an image."));
  },
});

function avatarFileName(avatarUrl) {
  if (!avatarUrl) return "";
  try { return path.basename(new URL(avatarUrl, "http://localhost").searchParams.get("file") || ""); }
  catch { return ""; }
}

app.post("/api/me/avatar", requireAuth, (req, res) => {
  avatarUpload.single("avatar")(req, res, (err) => {
    if (err) return res.status(400).json({ ok: false, message: err.message });
    if (!req.file) return res.status(400).json({ ok: false, message: "No profile photo selected." });
    const user = users.findById(req.session.user.id);
    if (user && user.avatarUrl) {
      const oldPath = path.join(AVATAR_DIR, avatarFileName(user.avatarUrl));
      fs.unlink(oldPath, () => {});
    }
    const avatarUrl = `/api/users/${req.session.user.id}/avatar?file=${encodeURIComponent(req.file.filename)}`;
    const updated = users.updateProfile(req.session.user.id, { avatarUrl });
    req.session.user = { ...req.session.user, ...users.publicProfile(updated) };
    for (const socket of io.of("/").sockets.values()) {
      if (socket.user.id === req.session.user.id) socket.user = req.session.user;
    }
    res.json({ ok: true, user: req.session.user });
  });
});

app.delete("/api/me/avatar", requireAuth, (req, res) => {
  const user = users.findById(req.session.user.id);
  if (!user) return res.status(404).json({ ok: false, message: "User not found." });
  if (user.avatarUrl) fs.unlink(path.join(AVATAR_DIR, avatarFileName(user.avatarUrl)), () => {});
  const updated = users.updateProfile(user.id, { avatarUrl: "" });
  req.session.user = { ...req.session.user, ...users.publicProfile(updated) };
  res.json({ ok: true, user: req.session.user });
});

app.get("/api/users/:id/avatar", requireAuth, (req, res) => {
  const user = users.findById(req.params.id);
  const file = avatarFileName(user && user.avatarUrl);
  if (!file) return res.status(404).end();
  const filePath = path.join(AVATAR_DIR, file);
  if (!fs.existsSync(filePath)) return res.status(404).end();
  res.sendFile(filePath);
});

app.post("/api/me/profile", requireAuth, (req, res) => {
  const theme = req.body && req.body.theme;
  const allowedThemes = ["hacker", "liquid", "aurora", "ember", "solar", "ocean", "signal", "violet", "crimson", "mono", "ice", "toxic"];
  if (!allowedThemes.includes(theme)) return res.status(400).json({ ok: false, message: "Invalid theme." });
  const updated = users.updateProfile(req.session.user.id, { theme, accent: req.body.accent, density: req.body.density, motion: req.body.motion });
  req.session.user = { ...req.session.user, ...users.publicProfile(updated) };
  for (const socket of io.of("/").sockets.values()) {
    if (socket.user.id === req.session.user.id) socket.user = req.session.user;
  }
  res.json({ ok: true, user: req.session.user });
});

// ---------------- role/member management ----------------
app.get("/api/users", requirePermission("users"), (req, res) => {
  res.json({ ok: true, users: users.listPublic() });
});

app.post("/api/users", requirePermission("users"), async (req, res) => {
  try {
    const { username, password, role } = req.body || {};
    if (!username || !password || !role) {
      return res.status(400).json({ ok: false, message: "username, password, role required." });
    }
    const actorRole = roles.getRole(req.session.user.role);
    const targetRole = roles.getRole(role);
    if (!actorRole || !targetRole || !roles.canManage(req.session.user, targetRole)) {
      return res.status(403).json({ ok: false, message: "You cannot create an identity at that clearance." });
    }
    if (password.length < 6) {
      return res.status(400).json({ ok: false, message: "Password must be at least 6 characters." });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = users.addUser({ username, passwordHash, role: targetRole.name });
    res.json({ ok: true, user: { id: user.id, username: user.username, role: user.role } });
  } catch (err) {
    res.status(400).json({ ok: false, message: err.message });
  }
});

app.delete("/api/users/:id", requirePermission("users"), (req, res) => {
  try {
    const target = users.findById(req.params.id);
    if (!target || !roles.canManage(req.session.user, roles.getRole(target.role))) return res.status(403).json({ ok: false, message: "You cannot remove a higher-level identity." });
    const removed = users.removeUser(req.params.id);
    if (!removed) return res.status(404).json({ ok: false, message: "User not found." });
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ ok: false, message: err.message });
  }
});

app.get("/api/roles", requirePermission("roles"), (req, res) => res.json({ ok: true, roles: roles.allRoles(), permissions: roles.PERMISSIONS }));
app.post("/api/roles", requirePermission("roles"), (req, res) => {
  const actor = roles.getRole(req.session.user.role);
  if (!actor || actor.level <= Number(req.body.level || 1)) return res.status(403).json({ ok: false, message: "You cannot create a role at or above your clearance." });
  if (!req.body.name) return res.status(400).json({ ok: false, message: "Role name required." });
  res.json({ ok: true, role: roles.createRole(req.body), audit: recordAudit({ actor: req.session.user.username, action: "created role", target: req.body.name }) });
});
app.patch("/api/roles/:id", requirePermission("roles"), (req, res) => {
  const target = roles.getRole(req.params.id); const actor = roles.getRole(req.session.user.role);
  if (!target || !actor || !roles.canManage(req.session.user, target)) return res.status(403).json({ ok: false, message: "Lower-level users cannot modify higher-level roles." });
  res.json({ ok: true, role: roles.updateRole(req.params.id, req.body), audit: recordAudit({ actor: req.session.user.username, action: "updated role", target: target.name, previousRole: target.name, reason: req.body.reason || "Role configuration" }) });
});
app.delete("/api/roles/:id", requirePermission("roles"), (req, res) => { try { const role = roles.deleteRole(req.params.id); res.json({ ok: true, audit: recordAudit({ actor: req.session.user.username, action: "deleted role", target: role.name }) }); } catch (err) { res.status(400).json({ ok: false, message: err.message }); } });
app.patch("/api/users/:id/role", requirePermission("users"), (req, res) => {
  const actor = roles.getRole(req.session.user.role); const target = roles.getRole(req.body.role); const member = users.findById(req.params.id);
  if (!member || !target) return res.status(404).json({ ok: false, message: "User or role not found." });
  if (!actor || !roles.canManage(req.session.user, target) || (roles.getRole(member.role) && !roles.canManage(req.session.user, roles.getRole(member.role)))) return res.status(403).json({ ok: false, message: "You cannot assign or change a higher-level role." });
  users.updateProfile(member.id, { role: target.name });
  res.json({ ok: true, audit: recordAudit({ actor: req.session.user.username, target: member.username, action: "assigned", previousRole: member.role, newRole: target.name, reason: req.body.reason || "Role assignment" }) });
});

// ---------------- file upload/download/delete ----------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safeExt = path.extname(file.originalname).slice(0, 10);
    cb(null, `${crypto.randomUUID()}${safeExt}`);
  },
});

const ALLOWED_MIME = [
  "image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml",
  "video/mp4", "video/webm", "video/quicktime",
  "application/pdf", "text/plain", "application/zip",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) cb(null, true);
    else cb(new Error("File type not allowed."));
  },
});

app.post("/api/files", requireAuth, (req, res) => {
  upload.single("file")(req, res, (err) => {
    if (err) return res.status(400).json({ ok: false, message: err.message });
    if (!req.file) return res.status(400).json({ ok: false, message: "No file uploaded." });

    const entry = fileStore.add({
      id: crypto.randomUUID(),
      originalName: req.file.originalname,
      storedName: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
      uploadedBy: req.session.user.username,
      uploadedById: req.session.user.id,
      uploadedAt: new Date().toISOString(),
    });
    res.json({ ok: true, file: entry });
  });
});

app.get("/api/files", requireAuth, (req, res) => {
  res.json({ ok: true, files: fileStore.all() });
});

app.get("/api/files/:id/raw", requireAuth, (req, res) => {
  const entry = fileStore.get(req.params.id);
  if (!entry) return res.status(404).send("Not found");
  const filePath = path.join(UPLOAD_DIR, entry.storedName);
  if (!fs.existsSync(filePath)) return res.status(404).send("Not found");
  res.setHeader("Content-Type", entry.mimetype);
  res.sendFile(filePath);
});

app.get("/api/files/:id/download", requireAuth, (req, res) => {
  const entry = fileStore.get(req.params.id);
  if (!entry) return res.status(404).send("Not found");
  const filePath = path.join(UPLOAD_DIR, entry.storedName);
  if (!fs.existsSync(filePath)) return res.status(404).send("Not found");
  res.download(filePath, entry.originalName);
});

app.delete("/api/files/:id", requireAuth, (req, res) => {
  const entry = fileStore.get(req.params.id);
  if (!entry) return res.status(404).json({ ok: false, message: "Not found." });

  const isOwnerOrAdmin = ["owner", "admin"].includes(req.session.user.role);
  const isUploader = entry.uploadedById === req.session.user.id;
  if (!isOwnerOrAdmin && !isUploader) {
    return res.status(403).json({ ok: false, message: "Not allowed." });
  }

  const filePath = path.join(UPLOAD_DIR, entry.storedName);
  fs.unlink(filePath, () => {});
  fileStore.remove(entry.id);
  res.json({ ok: true });
});

// ---------------- Socket.IO: auth, then chat + call signaling ----------------
io.use((socket, next) => {
  const sess = socket.request.session;
  if (sess && sess.user) {
    socket.user = sess.user;
    return next();
  }
  next(new Error("unauthorized"));
});

io.on("connection", (socket) => {
  socket.emit("chat:history", chatStore.recent(50));

  socket.on("chat:message", (text) => {
    if (typeof text !== "string") return;
    const trimmed = text.trim().slice(0, 2000);
    if (!trimmed) return;

    const msg = {
      id: crypto.randomUUID(),
      username: socket.user.username,
      role: socket.user.role,
      avatarUrl: socket.user.avatarUrl || "",
      text: trimmed,
      ts: new Date().toISOString(),
    };
    chatStore.addMessage(msg);
    io.emit("chat:message", msg);
  });

  socket.on("chat:typing", () => {
    socket.broadcast.emit("chat:typing", { username: socket.user.username });
  });

  // ---------------- voice / video / screen-share call (WebRTC mesh) ----------------
  socket.on("call:join", () => {
    const existingPeers = [];
    for (const [id, s] of io.of("/").sockets) {
      if (id !== socket.id && s.inCall) {
        existingPeers.push({
          socketId: id,
          username: s.user.username,
          role: s.user.role,
          avatarUrl: s.user.avatarUrl || "",
          state: s.callState || { micOn: true, camOn: false, sharingScreen: false },
        });
      }
    }
    socket.inCall = true;
    socket.callState = { micOn: true, camOn: false, sharingScreen: false };
    socket.emit("call:peers", existingPeers);
    socket.broadcast.emit("call:peer-joined", {
      socketId: socket.id,
      username: socket.user.username,
      role: socket.user.role,
      avatarUrl: socket.user.avatarUrl || "",
      state: socket.callState,
    });
  });

  socket.on("call:signal", ({ to, type, payload }) => {
    if (!to || !type) return;
    const target = io.sockets.sockets.get(to);
    if (!target) return;
    target.emit("call:signal", { from: socket.id, type, payload });
  });

  socket.on("call:state", (state) => {
    if (!socket.inCall || typeof state !== "object") return;
    socket.callState = {
      micOn: !!state.micOn,
      camOn: !!state.camOn,
      sharingScreen: !!state.sharingScreen,
    };
    socket.broadcast.emit("call:state", { socketId: socket.id, state: socket.callState });
  });

  socket.on("profile:updated", (profile) => {
    if (profile && typeof profile === "object") socket.broadcast.emit("profile:updated", { id: socket.user.id, ...profile });
  });

  socket.on("call:leave", () => {
    socket.inCall = false;
    socket.callState = null;
    socket.broadcast.emit("call:peer-left", { socketId: socket.id });
  });

  socket.on("disconnect", () => {
    if (socket.inCall) {
      socket.broadcast.emit("call:peer-left", { socketId: socket.id });
    }
  });
});

app.use("/api", (req, res) => {
  res.status(404).json({ ok: false, message: "API endpoint not found." });
});

server.listen(PORT, () => {
  console.log(`ShadowByte running on http://localhost:${PORT}`);
});
