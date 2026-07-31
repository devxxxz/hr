let CURRENT_USER = null;
const avatarInitial = document.getElementById("avatarInitial");

// ---------- toast ----------
function toast(msg, type = "success") {
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

// ---------- nav / mobile menu ----------
const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");
const hamburger = document.getElementById("hamburger");

function openSidebar() { sidebar.classList.add("open"); overlay.classList.add("show"); }
function closeSidebar() { sidebar.classList.remove("open"); overlay.classList.remove("show"); }
hamburger.addEventListener("click", () => sidebar.classList.contains("open") ? closeSidebar() : openSidebar());
overlay.addEventListener("click", closeSidebar);

document.querySelectorAll(".nav-item[data-section]").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-item[data-section]").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const section = btn.dataset.section;
    document.querySelectorAll(".section").forEach((s) => s.classList.remove("active"));
    document.getElementById(`section-${section}`).classList.add("active");
    document.getElementById("sectionTitle").textContent = btn.dataset.label || btn.textContent.trim();
    closeSidebar();
    if (section === "members") loadMembers();
    if (section === "files") loadFiles();
  });
});

// ---------- who am I / role gating ----------
async function loadMe() {
  try {
    const res = await fetch("/api/me");
    const data = await res.json();
    if (!data.ok) { window.location.href = "/"; return; }
    CURRENT_USER = data.user;

    document.getElementById("whoami").textContent = CURRENT_USER.username;
    document.getElementById("whoamiRole").textContent = CURRENT_USER.role;
    document.getElementById("roleBadge").textContent = CURRENT_USER.role.toUpperCase();
    document.getElementById("accessLevel").textContent = CURRENT_USER.role === "owner" ? "ROOT" : CURRENT_USER.role.toUpperCase();
    document.getElementById("avatarInitial").textContent = CURRENT_USER.username.charAt(0).toUpperCase();

    if (CURRENT_USER.role === "owner" || CURRENT_USER.role === "admin") {
      document.getElementById("membersNav").style.display = "flex";
      document.getElementById("membersNav").querySelector(".badge").textContent = CURRENT_USER.role;
    }
    // only owner can add members
    if (CURRENT_USER.role !== "owner") {
      const form = document.querySelector(".member-form");
      if (form) form.style.display = "none";
    }

    connectSocket();
    loadFiles();
  } catch {
    window.location.href = "/";
  }
}
loadMe();


document.getElementById("logoutBtn").addEventListener("click", async () => {
  const res = await fetch("/api/logout", { method: "POST" });
  const data = await res.json();
  window.location.href = data.redirect || "/";
});

// ---------- Files ----------
const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("fileInput");
const fileGrid = document.getElementById("fileGrid");
const uploadStatus = document.getElementById("uploadStatus");

dropzone.addEventListener("click", () => fileInput.click());
["dragenter", "dragover"].forEach((evt) =>
  dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.add("drag"); })
);
["dragleave", "drop"].forEach((evt) =>
  dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.remove("drag"); })
);
dropzone.addEventListener("drop", (e) => {
  const files = e.dataTransfer.files;
  if (files.length) uploadFiles(files);
});
fileInput.addEventListener("change", () => {
  if (fileInput.files.length) uploadFiles(fileInput.files);
  fileInput.value = "";
});

async function uploadFiles(fileList) {
  uploadStatus.className = "status";
  uploadStatus.textContent = `Uploading ${fileList.length} file(s)...`;
  let success = 0;
  for (const file of fileList) {
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/files", { method: "POST", body: fd });
      const data = await res.json();
      if (data.ok) success++;
      else toast(data.message || "Upload failed", "error");
    } catch {
      toast("Upload failed: " + file.name, "error");
    }
  }
  uploadStatus.textContent = `Uploaded ${success}/${fileList.length} file(s).`;
  uploadStatus.className = "status success";
  loadFiles();
}

function iconFor(mimetype) {
  if (mimetype.startsWith("image/")) return "🖼️";
  if (mimetype.startsWith("video/")) return "🎬";
  if (mimetype === "application/pdf") return "📄";
  if (mimetype.includes("zip")) return "🗜️";
  return "📁";
}

function fmtSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

async function loadFiles() {
  try {
    const res = await fetch("/api/files");
    const data = await res.json();
    if (!data.ok) return;
    document.getElementById("fileCount").textContent = data.files.length;
    fileGrid.innerHTML = "";
    data.files.forEach((f) => {
      const card = document.createElement("div");
      card.className = "file-card";

      let thumb = `<div class="icon">${iconFor(f.mimetype)}</div>`;
      if (f.mimetype.startsWith("image/")) {
        thumb = `<img src="/api/files/${f.id}/raw" alt="${f.originalName}" loading="lazy" />`;
      } else if (f.mimetype.startsWith("video/")) {
        thumb = `<video src="/api/files/${f.id}/raw" muted></video>`;
      }

      const canDelete = CURRENT_USER && (["owner", "admin"].includes(CURRENT_USER.role) || f.uploadedById === CURRENT_USER.id);

      card.innerHTML = `
        <div class="file-thumb">${thumb}</div>
        <div class="file-info">
          <div class="file-name" title="${f.originalName}">${f.originalName}</div>
          <div class="file-meta">${fmtSize(f.size)} · ${f.uploadedBy}</div>
        </div>
        <div class="file-actions">
          <button class="btn btn-ghost" onclick="window.open('/api/files/${f.id}/download','_blank')">Download</button>
          ${canDelete ? `<button class="btn btn-danger" data-delete="${f.id}">Delete</button>` : ""}
        </div>
      `;
      fileGrid.appendChild(card);
    });

    fileGrid.querySelectorAll("[data-delete]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.delete;
        const res = await fetch(`/api/files/${id}`, { method: "DELETE" });
        const data = await res.json();
        if (data.ok) { toast("File deleted"); loadFiles(); }
        else toast(data.message || "Delete failed", "error");
      });
    });
  } catch {
    toast("Failed to load files", "error");
  }
}

// ---------- Chat ----------
let socket = null;
const chatMessages = document.getElementById("chatMessages");
const chatInput = document.getElementById("chatInput");
const chatSend = document.getElementById("chatSend");

function renderMessage(msg) {
  const div = document.createElement("div");
  const mine = CURRENT_USER && msg.username === CURRENT_USER.username;
  div.className = "chat-msg" + (mine ? " mine" : "");
  const time = new Date(msg.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  div.innerHTML = `<div class="meta">${msg.username} · ${msg.role} · ${time}</div>${escapeHtml(msg.text)}`;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function connectSocket() {
  socket = io();
  socket.on("chat:history", (history) => {
    chatMessages.innerHTML = "";
    history.forEach(renderMessage);
  });
  socket.on("chat:message", renderMessage);
}

function sendChat() {
  const text = chatInput.value.trim();
  if (!text || !socket) return;
  socket.emit("chat:message", text);
  chatInput.value = "";
}
chatSend.addEventListener("click", sendChat);
chatInput.addEventListener("keydown", (e) => { if (e.key === "Enter") sendChat(); });

// ---------- Members ----------
async function loadMembers() {
  try {
    const res = await fetch("/api/users");
    const data = await res.json();
    if (!data.ok) return;
    const tbody = document.getElementById("membersTable");
    tbody.innerHTML = "";
    data.users.forEach((u) => {
      const tr = document.createElement("tr");
      const canRemove = CURRENT_USER.role === "owner" && u.role !== "owner";
      const avatarHtml = `<span class="member-avatar fallback">${u.username.charAt(0).toUpperCase()}</span>`;
      tr.innerHTML = `
        <td><div class="member-user">${avatarHtml}<span>${u.username}</span></div></td>
        <td><span class="role-pill ${u.role}">${u.role}</span></td>
        <td>${new Date(u.createdAt).toLocaleDateString()}</td>
        <td>${canRemove ? `<button class="btn btn-danger" data-remove="${u.id}" style="padding:6px 12px;font-size:11px;">Remove</button>` : ""}</td>
      `;
      tbody.appendChild(tr);
    });
    tbody.querySelectorAll("[data-remove]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.remove;
        const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
        const data = await res.json();
        if (data.ok) { toast("Member removed"); loadMembers(); }
        else toast(data.message || "Failed", "error");
      });
    });
  } catch {
    toast("Failed to load members", "error");
  }
}

const addMemberBtn = document.getElementById("addMemberBtn");
if (addMemberBtn) {
  addMemberBtn.addEventListener("click", async () => {
    const username = document.getElementById("newUsername").value.trim();
    const password = document.getElementById("newPassword").value;
    const role = document.getElementById("newRole").value;
    const memberStatus = document.getElementById("memberStatus");
    memberStatus.className = "status";
    if (!username || !password) {
      memberStatus.textContent = "Username and password required.";
      memberStatus.className = "status error";
      return;
    }
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, role }),
      });
      const data = await res.json();
      if (data.ok) {
        memberStatus.textContent = "Member added.";
        memberStatus.className = "status success";
        document.getElementById("newUsername").value = "";
        document.getElementById("newPassword").value = "";
        loadMembers();
      } else {
        memberStatus.textContent = data.message || "Failed to add member.";
        memberStatus.className = "status error";
      }
    } catch {
      memberStatus.textContent = "Connection error.";
      memberStatus.className = "status error";
    }
  });
}
