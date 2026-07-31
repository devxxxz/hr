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
const { requireAuth, requireRole } = require("./src/middleware");

users.seedOwner();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const UPLOAD_DIR = path.join(__dirname, "uploads");
const AVATAR_DIR = path.join(UPLOAD_DIR, "avatars");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(AVATAR_DIR)) fs.mkdirSync(AVATAR_DIR, { recursive: true });

app.set("trust proxy", 1); // needed for secure cookies behind a reverse proxy (e.g. nginx)
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || "hr-" + crypto.randomBytes(24).toString("hex"),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 8, // 8 hours
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.FORCE_HTTPS === "true",
  },
});
app.use(sessionMiddleware);

// share session with socket.io
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
    req.session.user = { id: user.id, username: user.username, role: user.role, avatar: user.avatar || null };
    res.json({ ok: true, redirect: "/dashboard" });
  });
});

app.get("/api/me", requireAuth, (req, res) => {
  const user = {
    ...req.session.user,
    avatar: req.session.user.avatar ? `/api/avatars/${req.session.user.avatar}` : null,
  };
  res.json({ ok: true, user });
});

app.post("/api/me/avatar", requireAuth, (req, res) => {
  avatarUpload.single("avatar")(req, res, (err) => {
    if (err) return res.status(400).json({ ok: false, message: err.message });
    if (!req.file) return res.status(400).json({ ok: false, message: "No avatar uploaded." });

    const existing = req.session.user.avatar;
    if (existing) {
      const oldPath = path.join(AVATAR_DIR, existing);
      fs.unlink(oldPath, () => {});
    }

    users.updateUser(req.session.user.id, { avatar: req.file.filename });
    req.session.user.avatar = req.file.filename;
    res.json({ ok: true, avatar: `/api/avatars/${req.file.filename}` });
  });
});

app.get("/api/avatars/:filename", requireAuth, (req, res) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(AVATAR_DIR, filename);
  if (!fs.existsSync(filePath)) return res.status(404).send("Not found");
  res.sendFile(filePath);
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ ok: true, redirect: "/" });
  });
});

// ---------------- role/member management (owner only) ----------------
app.get("/api/users", requireRole("owner", "admin"), (req, res) => {
  res.json({ ok: true, users: users.listPublic() });
});

app.post("/api/users", requireRole("owner"), async (req, res) => {
  try {
    const { username, password, role, avatar } = req.body || {};
    if (!username || !password || !role) {
      return res.status(400).json({ ok: false, message: "username, password, role required." });
    }
    if (!["owner", "admin", "member"].includes(role)) {
      return res.status(400).json({ ok: false, message: "Invalid role." });
    }
    if (password.length < 6) {
      return res.status(400).json({ ok: false, message: "Password must be at least 6 characters." });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = users.addUser({ username, passwordHash, role, avatar: avatar || null });
    res.json({ ok: true, user: { id: user.id, username: user.username, role: user.role, avatar: user.avatar || null } });
  } catch (err) {
    res.status(400).json({ ok: false, message: err.message });
  }
});

app.delete("/api/users/:id", requireRole("owner"), (req, res) => {
  try {
    const removed = users.removeUser(req.params.id);
    if (!removed) return res.status(404).json({ ok: false, message: "User not found." });
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ ok: false, message: err.message });
  }
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
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB
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

// stream file only to authenticated users (private, not statically exposed)
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

// ---------------- chat (Socket.IO) ----------------
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
      text: trimmed,
      ts: new Date().toISOString(),
    };
    chatStore.addMessage(msg);
    io.emit("chat:message", msg);
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
          avatar: s.user.avatar || null,
        });
      }
    }
    socket.inCall = true;
    socket.emit("call:peers", existingPeers);
    socket.broadcast.emit("call:peer-joined", {
      socketId: socket.id,
      username: socket.user.username,
      role: socket.user.role,
      avatar: socket.user.avatar || null,
    });
  });

  socket.on("call:signal", ({ to, type, payload }) => {
    if (!to || !type) return;
    const target = io.sockets.sockets.get(to);
    if (!target) return;
    target.emit("call:signal", { from: socket.id, type, payload });
  });

  socket.on("call:leave", () => {
    socket.inCall = false;
    socket.broadcast.emit("call:peer-left", { socketId: socket.id });
  });

  socket.on("disconnect", () => {
    if (socket.inCall) {
      socket.broadcast.emit("call:peer-left", { socketId: socket.id });
    }
  });
});

server.listen(PORT, () => {
  console.log(`Hackers Residence running on http://localhost:${PORT}`);
});
