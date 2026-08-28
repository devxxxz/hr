let CURRENT_USER = null;
<<<<<<< HEAD
let CONTROL_DATA = null;
const XP_RANKS = [[0,"Newborn"],[100,"Initiate"],[300,"Operator"],[750,"Analyst"],[1500,"Specialist"],[3000,"Researcher"],[6000,"Sentinel"],[10000,"Vanguard"],[20000,"Elite"],[35000,"Shadow"],[50000,"ShadowByte"],[75000,"Black Ops"],[100000,"Apex"]];

function avatarMarkup(user, className = "") {
  const initial = (user.username || "?").charAt(0).toUpperCase();
  return user.avatarUrl
    ? `<img class="avatar-image ${className}" src="${user.avatarUrl}" alt="${escapeHtml(user.username)}" />`
    : `<span class="avatar-letter ${className}">${initial}</span>`;
}

=======
const avatarInitial = document.getElementById("avatarInitial");

// ---------- toast ----------
>>>>>>> a77ef059e85bdaf13eadf2dd59f745d0221b2dad
function toast(msg, type = "success") {
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

<<<<<<< HEAD
=======
// ---------- nav / mobile menu ----------
>>>>>>> a77ef059e85bdaf13eadf2dd59f745d0221b2dad
const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");
const hamburger = document.getElementById("hamburger");

<<<<<<< HEAD
function openSidebar() { sidebar.classList.add("open"); overlay.classList.add("show"); document.body.classList.add("sidebar-is-open"); }
function closeSidebar() { sidebar.classList.remove("open"); overlay.classList.remove("show"); document.body.classList.remove("sidebar-is-open"); }
hamburger.addEventListener("click", () => sidebar.classList.contains("open") ? closeSidebar() : openSidebar());
overlay.addEventListener("click", closeSidebar);

let unreadChat = 0;
const chatBadge = document.getElementById("chatBadge");

=======
function openSidebar() { sidebar.classList.add("open"); overlay.classList.add("show"); }
function closeSidebar() { sidebar.classList.remove("open"); overlay.classList.remove("show"); }
hamburger.addEventListener("click", () => sidebar.classList.contains("open") ? closeSidebar() : openSidebar());
overlay.addEventListener("click", closeSidebar);

>>>>>>> a77ef059e85bdaf13eadf2dd59f745d0221b2dad
document.querySelectorAll(".nav-item[data-section]").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-item[data-section]").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const section = btn.dataset.section;
    document.querySelectorAll(".section").forEach((s) => s.classList.remove("active"));
    document.getElementById(`section-${section}`).classList.add("active");
<<<<<<< HEAD
    document.getElementById("sectionTitle").textContent = btn.textContent.trim().split("\n")[0].trim();
    closeSidebar();
    if (section === "members") loadMembers();
    if (section === "files") loadFiles();
    if (section === "chat") { unreadChat = 0; chatBadge.style.display = "none"; }
    if (section === "ranks") loadRoleRequests();
  });
});

=======
    document.getElementById("sectionTitle").textContent = btn.dataset.label || btn.textContent.trim();
    closeSidebar();
    if (section === "members") loadMembers();
    if (section === "files") loadFiles();
  });
});

// ---------- who am I / role gating ----------
>>>>>>> a77ef059e85bdaf13eadf2dd59f745d0221b2dad
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
<<<<<<< HEAD
    applyProfile(CURRENT_USER);
    document.getElementById("welcomeName").textContent = CURRENT_USER.username.split("@")[0];
    document.getElementById("heroName").textContent = CURRENT_USER.username;
    document.getElementById("heroRole").textContent = CURRENT_USER.role.toUpperCase();
    document.getElementById("heroAvatar").innerHTML = avatarMarkup(CURRENT_USER);
    document.getElementById("currentDate").textContent = new Date().toLocaleDateString([], { month: "short", day: "2-digit" }).toUpperCase();

    if (CURRENT_USER.role === "owner" || CURRENT_USER.role === "admin") {
      document.getElementById("membersNav").style.display = "flex";
    }
=======
    document.getElementById("avatarInitial").textContent = CURRENT_USER.username.charAt(0).toUpperCase();

    if (CURRENT_USER.role === "owner" || CURRENT_USER.role === "admin") {
      document.getElementById("membersNav").style.display = "flex";
      document.getElementById("membersNav").querySelector(".badge").textContent = CURRENT_USER.role;
    }
    // only owner can add members
>>>>>>> a77ef059e85bdaf13eadf2dd59f745d0221b2dad
    if (CURRENT_USER.role !== "owner") {
      const form = document.querySelector(".member-form");
      if (form) form.style.display = "none";
    }

<<<<<<< HEAD
    connectChatSocket();
    loadFiles();
    loadControlCenter();
    loadAssignableRoles();
    loadRoleRequests();
=======
    connectSocket();
    loadFiles();
>>>>>>> a77ef059e85bdaf13eadf2dd59f745d0221b2dad
  } catch {
    window.location.href = "/";
  }
}
loadMe();

<<<<<<< HEAD
async function loadAssignableRoles() { try { const response = await fetch("/api/role-requests"); const data = await response.json(); if (!data.ok) return; const publicRoles = data.roles.filter(isPublicRole); const select = document.getElementById("newRole"); if (select) select.innerHTML = publicRoles.map((role) => `<option value="${role.id}">${escapeHtml(role.name)}</option>`).join(""); if (rolePickerGrid) rolePickerGrid.innerHTML = publicRoles.map((role) => `<button type="button" class="role-choice" data-role-id="${role.id}" data-role-name="${escapeHtml(role.name)}"><span class="role-choice-icon">✦</span><span><strong>${escapeHtml(role.name)}</strong><small>${escapeHtml(role.department)}</small></span><span class="role-choice-arrow">›</span></button>`).join(""); } catch { /* keep the safe default role options */ } }
loadAssignableRoles();

async function loadRoleRequests() { try { const res = await fetch("/api/role-requests"); const data = await res.json(); if (!data.ok) return; const select = document.getElementById("requestRole"); select.innerHTML = data.roles.map((role) => `<option value="${role.id}">${escapeHtml(role.name)} · ${escapeHtml(role.department)}</option>`).join(""); const canReview = CURRENT_USER && ["owner", "Founder", "admin", "Administrator", "Co-Founder", "Executive", "Director"].includes(CURRENT_USER.role); document.getElementById("requestScope").textContent = canReview ? "REVIEW QUEUE" : "MY REQUESTS"; document.getElementById("roleRequestList").innerHTML = data.requests.length ? data.requests.map((request) => `<div class="request-row"><div><strong>${escapeHtml(request.username)} · ${escapeHtml(request.role)}</strong><small>${escapeHtml(request.reason)}</small><time>${new Date(request.createdAt).toLocaleDateString()} · ${request.status.toUpperCase()}</time></div>${canReview && request.status === "pending" ? `<span class="request-actions"><button class="btn btn-primary" data-request="${request.id}" data-decision="approved">Approve</button><button class="btn btn-danger" data-request="${request.id}" data-decision="rejected">Reject</button></span>` : `<em class="request-status ${request.status}">${request.status}</em>`}</div>`).join("") : `<div class="empty-state"><strong>No role requests</strong><small>Your queue is clear.</small></div>`; } catch { toast("Could not load role requests", "error"); } }
function isPublicRole(role) { return role.enabled && role.department !== "Leadership" && role.department !== "Administration" && !role.permissions.some((permission) => ["users", "roles", "system"].includes(permission)); }
function renderRankRoles(rolesList) { const catalog = document.getElementById("rankRoleCatalog"); if (!catalog) return; catalog.innerHTML = rolesList.filter(isPublicRole).map((role) => `<article class="rank-role"><span class="role-icon">✦</span><strong>${escapeHtml(role.name)}</strong><small>${escapeHtml(role.department)} · ${escapeHtml(role.description)}</small><em>AVAILABLE BY REQUEST</em></article>`).join(""); }
document.getElementById("submitRoleRequest")?.addEventListener("click", async () => { const status = document.getElementById("requestStatus"); const res = await fetch("/api/role-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ roleId: document.getElementById("requestRole").value, reason: document.getElementById("requestReason").value }) }); const data = await res.json(); status.textContent = data.ok ? "Request sent to the owners." : (data.message || "Request failed."); status.className = `status ${data.ok ? "success" : "error"}`; if (data.ok) { document.getElementById("requestReason").value = ""; loadRoleRequests(); } });
document.getElementById("roleRequestList")?.addEventListener("click", async (event) => { const button = event.target.closest("[data-request]"); if (!button) return; const res = await fetch(`/api/role-requests/${button.dataset.request}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: button.dataset.decision }) }); const data = await res.json(); if (!data.ok) toast(data.message || "Decision failed", "error"); else { toast(`Request ${button.dataset.decision}`); loadRoleRequests(); } });
document.querySelectorAll("[data-jump='ranks']").forEach((button) => button.addEventListener("click", () => document.querySelector("[data-section='ranks']").click()));

function rankForXp(xp) { let current = XP_RANKS[0]; XP_RANKS.forEach((rank) => { if (xp >= rank[0]) current = rank; }); return current; }
function renderRankProfile(user, leaderboard) {
  const current = rankForXp(user.xp || 0);
  document.getElementById("rankAvatar").innerHTML = avatarMarkup(user); document.getElementById("rankUsername").textContent = user.displayName || user.username; document.getElementById("rankDepartment").textContent = user.department || "Community"; document.getElementById("currentRank").textContent = current[1]; document.getElementById("rankReputation").textContent = (user.reputation || 0).toLocaleString(); document.getElementById("rankContributions").textContent = (user.contributions || 0).toLocaleString();
  const entry = leaderboard.find((member) => member.id === user.id); document.getElementById("rankPosition").textContent = entry ? `#${entry.position}` : "#—"; document.getElementById("rankRole").textContent = (user.role || "member").toUpperCase();
  document.getElementById("profileFacts").innerHTML = `<span><small>Display name</small><b>${escapeHtml(user.displayName || user.username)}</b></span><span><small>Join date</small><b>${new Date(user.createdAt || Date.now()).toLocaleDateString()}</b></span><span><small>Verification</small><b>${user.verified ? "Verified identity" : "Pending review"}</b></span><span><small>Team / department</small><b>${escapeHtml(user.department || "Community")}</b></span>`;
  document.getElementById("profileBadges").innerHTML = (user.badges && user.badges.length ? user.badges : ["VERIFIED", "RESEARCHER"]).map((badge) => `<span class="security-badge">${escapeHtml(badge)}</span>`).join("");
}
function renderLeaderboard(list) { document.getElementById("leaderboardRows").innerHTML = list.map((member) => `<div class="leader-row"><span class="leader-person"><b>#${member.position}</b>${avatarMarkup(member, "avatar-small")}<strong>${escapeHtml(member.displayName || member.username)}<small>@${escapeHtml(member.username)}</small></strong></span><span class="leader-rank">${escapeHtml(member.role)}</span><span>${(member.reputation || 0).toLocaleString()}</span><span class="leader-department">${escapeHtml(member.department || "Community")}</span><span class="leader-badges">${(member.badges || []).slice(0, 2).map((badge) => `<i>${escapeHtml(badge)}</i>`).join("") || "—"}</span></div>`).join(""); }
async function loadControlCenter() { try { const res = await fetch("/api/control-center"); const data = await res.json(); if (!data.ok) return; CONTROL_DATA = data; const canManage = data.roles.some((role) => role.permissions.includes("*") || role.permissions.includes("roles")); const canReview = data.roles.some((role) => role.permissions.includes("*") || role.permissions.includes("users")); document.getElementById("controlNav").style.display = canManage ? "flex" : "none"; document.getElementById("membersNav").style.display = canReview ? "flex" : "none"; const roleSelect = document.getElementById("newRole"); if (roleSelect) roleSelect.innerHTML = data.roles.filter((role) => role.enabled).map((role) => `<option value="${role.id}">${escapeHtml(role.name)}</option>`).join(""); renderRankRoles(data.roles.filter((role) => role.enabled)); renderRankProfile(data.user, data.leaderboard); renderLeaderboard(data.leaderboard); renderRoleCatalog(data.roles); document.getElementById("roleCount").textContent = data.roles.filter((role) => role.enabled).length; document.getElementById("memberCount").textContent = data.members.length; document.getElementById("permissionCount").textContent = data.permissions.length; if (data.audit?.length) document.getElementById("auditLog").innerHTML = data.audit.map((event) => `<div class="audit-row"><b>${new Date(event.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</b><span><strong>${escapeHtml(event.actor)} ${escapeHtml(event.action)} ${escapeHtml(event.target || "")}</strong><small>${escapeHtml(event.reason || "Permission event recorded")}</small></span><em>${escapeHtml(event.result)}</em></div>`).join(""); } catch { /* dashboard remains usable when control data is unavailable */ } }
function renderRoleCatalog(roleList) { const query = (document.getElementById("roleSearch")?.value || "").toLowerCase(); document.getElementById("roleCatalog").innerHTML = roleList.filter((role) => role.name.toLowerCase().includes(query) || role.department.toLowerCase().includes(query)).sort((a,b) => a.position - b.position).map((role) => `<div class="role-row"><span class="role-icon">${role.icon === "shield" ? "⌾" : role.icon === "code" ? "⌘" : "✦"}</span><span class="role-copy"><strong>${escapeHtml(role.name)}</strong><small>${escapeHtml(role.department)} · ${escapeHtml(role.description)}</small></span><span class="permission-count">${role.permissions.includes("*") ? "ALL" : role.permissions.length + " permissions"}</span><button class="icon-action" title="Toggle role" data-role-toggle="${role.id}">${role.enabled ? "ON" : "OFF"}</button></div>`).join(""); }
document.getElementById("roleSearch")?.addEventListener("input", () => renderRoleCatalog(CONTROL_DATA?.roles || []));
document.getElementById("roleCatalog")?.addEventListener("click", async (event) => { const button = event.target.closest("[data-role-toggle]"); if (!button || !CONTROL_DATA) return; const role = CONTROL_DATA.roles.find((item) => item.id === button.dataset.roleToggle); if (!role) return; if (role.permissions.includes("*") || role.permissions.some((permission) => ["users", "roles", "security", "system"].includes(permission))) { if (!window.confirm("This changes a sensitive permission boundary. Continue?")) return; } const res = await fetch(`/api/roles/${role.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: !role.enabled, reason: "Role availability update" }) }); const data = await res.json(); if (!data.ok) return toast(data.message || "Role update denied", "error"); toast(`${role.name} ${role.enabled ? "disabled" : "enabled"}`); loadControlCenter(); });
document.getElementById("leaderFilters")?.addEventListener("click", (event) => { const button = event.target.closest("button"); if (!button || !CONTROL_DATA) return; document.querySelectorAll("#leaderFilters button").forEach((item) => item.classList.remove("active")); button.classList.add("active"); const filter = button.dataset.filter; const list = filter === "Global" ? CONTROL_DATA.leaderboard : CONTROL_DATA.leaderboard.filter((member) => (filter === "Security" && member.department.includes("Security")) || (filter === "Developers" && member.department.includes("Engineering")) || (filter === "Researchers" && member.rank.includes("Research")) || (filter === "Community" && member.department === "Community" ) || filter === "Weekly" || filter === "Monthly"); renderLeaderboard(list.map((member, index) => ({ ...member, position: index + 1 }))); });
document.getElementById("newRoleBtn")?.addEventListener("click", async () => { const name = window.prompt("Role name"); if (!name) return; const department = window.prompt("Department", "Custom"); const description = window.prompt("Role description", "Custom ShadowByte role."); const sensitive = window.confirm("Does this role need sensitive permissions such as user, role, security, or system management?"); if (sensitive && !window.confirm("Sensitive permissions can change the security boundary. Create this role?")) return; const res = await fetch("/api/roles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, department, description, permissions: sensitive ? ["dashboard", "security"] : ["dashboard"], level: 1 }) }); const data = await res.json(); if (!data.ok) return toast(data.message || "Role creation denied", "error"); toast("Role created"); loadControlCenter(); });
=======
>>>>>>> a77ef059e85bdaf13eadf2dd59f745d0221b2dad

document.getElementById("logoutBtn").addEventListener("click", async () => {
  const res = await fetch("/api/logout", { method: "POST" });
  const data = await res.json();
  window.location.href = data.redirect || "/";
});

<<<<<<< HEAD
// ---------- Lightbox ----------
const lightbox = document.getElementById("lightbox");
const lightboxBody = document.getElementById("lightboxBody");
document.getElementById("lightboxClose").addEventListener("click", closeLightbox);
lightbox.addEventListener("click", (e) => { if (e.target === lightbox) closeLightbox(); });
function openLightbox(html) {
  lightboxBody.innerHTML = html;
  lightbox.classList.add("show");
}
function closeLightbox() {
  lightbox.classList.remove("show");
  lightboxBody.innerHTML = "";
}

=======
>>>>>>> a77ef059e85bdaf13eadf2dd59f745d0221b2dad
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
<<<<<<< HEAD
      const isImage = f.mimetype.startsWith("image/");
      const isVideo = f.mimetype.startsWith("video/");
      if (isImage) thumb = `<img src="/api/files/${f.id}/raw" alt="${f.originalName}" loading="lazy" />`;
      else if (isVideo) thumb = `<video src="/api/files/${f.id}/raw" muted></video>`;
=======
      if (f.mimetype.startsWith("image/")) {
        thumb = `<img src="/api/files/${f.id}/raw" alt="${f.originalName}" loading="lazy" />`;
      } else if (f.mimetype.startsWith("video/")) {
        thumb = `<video src="/api/files/${f.id}/raw" muted></video>`;
      }
>>>>>>> a77ef059e85bdaf13eadf2dd59f745d0221b2dad

      const canDelete = CURRENT_USER && (["owner", "admin"].includes(CURRENT_USER.role) || f.uploadedById === CURRENT_USER.id);

      card.innerHTML = `
<<<<<<< HEAD
        <div class="file-thumb" data-preview="${f.id}" data-type="${isImage ? "image" : isVideo ? "video" : "other"}">${thumb}</div>
=======
        <div class="file-thumb">${thumb}</div>
>>>>>>> a77ef059e85bdaf13eadf2dd59f745d0221b2dad
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

<<<<<<< HEAD
    fileGrid.querySelectorAll("[data-preview]").forEach((el) => {
      el.addEventListener("click", () => {
        const id = el.dataset.preview;
        const type = el.dataset.type;
        if (type === "image") openLightbox(`<img src="/api/files/${id}/raw" alt="" />`);
        else if (type === "video") openLightbox(`<video src="/api/files/${id}/raw" controls autoplay></video>`);
        else window.open(`/api/files/${id}/download`, "_blank");
      });
    });

=======
>>>>>>> a77ef059e85bdaf13eadf2dd59f745d0221b2dad
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

<<<<<<< HEAD
// ---------- Chat (always-on socket) ----------
let chatSocket = null;
const chatMessages = document.getElementById("chatMessages");
const chatInput = document.getElementById("chatInput");
const chatSend = document.getElementById("chatSend");
const typingIndicator = document.getElementById("typingIndicator");
=======
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
>>>>>>> a77ef059e85bdaf13eadf2dd59f745d0221b2dad

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

<<<<<<< HEAD
function applyProfile(user) {
  const themes = ["hacker", "liquid", "aurora", "ember", "solar", "ocean", "signal", "violet", "crimson", "mono", "ice", "toxic"];
  const theme = themes.includes(user.theme) ? user.theme : "hacker";
  document.body.dataset.theme = theme;
  if (user.accent) document.documentElement.style.setProperty("--green", user.accent);
  document.body.dataset.density = user.density || "comfortable";
  document.body.classList.toggle("reduced-motion", user.motion === false);
  document.getElementById("avatarInitial").innerHTML = avatarMarkup(user);
  document.getElementById("profileAvatar").innerHTML = avatarMarkup(user);
  document.getElementById("profileName").textContent = user.username;
  if (document.getElementById("accentColor")) document.getElementById("accentColor").value = user.accent || "#00ffa3";
  if (document.getElementById("densitySelect")) document.getElementById("densitySelect").value = user.density || "comfortable";
  if (document.getElementById("motionToggle")) document.getElementById("motionToggle").checked = user.motion !== false;
  const themeInput = document.querySelector(`input[name="theme"][value="${theme}"]`);
  if (themeInput) themeInput.checked = true;
}

function renderMessage(msg, { isHistory } = {}) {
  const div = document.createElement("div");
  const mine = CURRENT_USER && msg.username === CURRENT_USER.username;
  div.className = "chat-msg" + (mine ? " mine" : "");
  const time = new Date(msg.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  div.innerHTML = `<div class="chat-author">${avatarMarkup({ username: msg.username, avatarUrl: msg.avatarUrl })}<div class="meta">${msg.username} · ${msg.role} · ${time}</div></div>${escapeHtml(msg.text)}`;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  if (!isHistory && !mine) {
    const activeSection = document.querySelector(".section.active");
    if (!activeSection || activeSection.id !== "section-chat") {
      unreadChat++;
      chatBadge.style.display = "inline-flex";
      chatBadge.textContent = unreadChat;
    }
  }
}

function connectChatSocket() {
  chatSocket = io();
  chatSocket.on("chat:history", (history) => {
    chatMessages.innerHTML = "";
    history.forEach((m) => renderMessage(m, { isHistory: true }));
  });
  chatSocket.on("chat:message", (m) => renderMessage(m));
  chatSocket.on("chat:typing", ({ username }) => {
    typingIndicator.textContent = `${username} is typing…`;
    typingIndicator.style.display = "block";
    clearTimeout(typingIndicator._t);
    typingIndicator._t = setTimeout(() => { typingIndicator.style.display = "none"; }, 2000);
  });
=======
function connectSocket() {
  socket = io();
  socket.on("chat:history", (history) => {
    chatMessages.innerHTML = "";
    history.forEach(renderMessage);
  });
  socket.on("chat:message", renderMessage);
>>>>>>> a77ef059e85bdaf13eadf2dd59f745d0221b2dad
}

function sendChat() {
  const text = chatInput.value.trim();
<<<<<<< HEAD
  if (!text || !chatSocket) return;
  chatSocket.emit("chat:message", text);
=======
  if (!text || !socket) return;
  socket.emit("chat:message", text);
>>>>>>> a77ef059e85bdaf13eadf2dd59f745d0221b2dad
  chatInput.value = "";
}
chatSend.addEventListener("click", sendChat);
chatInput.addEventListener("keydown", (e) => { if (e.key === "Enter") sendChat(); });

<<<<<<< HEAD
let typingTimer = null;
chatInput.addEventListener("input", () => {
  if (!chatSocket) return;
  if (typingTimer) return;
  chatSocket.emit("chat:typing");
  typingTimer = setTimeout(() => { typingTimer = null; }, 1200);
});

=======
>>>>>>> a77ef059e85bdaf13eadf2dd59f745d0221b2dad
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
<<<<<<< HEAD
      const rank = rankForXp(u.xp || 0)[1];
      tr.innerHTML = `
        <td><span class="member-identity">${avatarMarkup(u, "avatar-small")}<b>${escapeHtml(u.displayName || u.username)}<small>@${escapeHtml(u.username)}</small></b></span></td>
        <td><span class="role-pill ${String(u.role).toLowerCase().replace(/[^a-z]+/g, "-")}">${escapeHtml(u.role)}</span></td>
        <td><span class="member-rank">${rank}</span></td>
=======
      const avatarHtml = `<span class="member-avatar fallback">${u.username.charAt(0).toUpperCase()}</span>`;
      tr.innerHTML = `
        <td><div class="member-user">${avatarHtml}<span>${u.username}</span></div></td>
        <td><span class="role-pill ${u.role}">${u.role}</span></td>
>>>>>>> a77ef059e85bdaf13eadf2dd59f745d0221b2dad
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
<<<<<<< HEAD
const rolePickerModal = document.getElementById("rolePickerModal");
const rolePickerGrid = document.getElementById("rolePickerGrid");
document.getElementById("rolePickerTrigger")?.addEventListener("click", () => rolePickerModal.classList.add("show"));
document.getElementById("rolePickerClose")?.addEventListener("click", () => rolePickerModal.classList.remove("show"));
rolePickerModal?.addEventListener("click", (event) => { if (event.target === rolePickerModal) rolePickerModal.classList.remove("show"); const choice = event.target.closest("[data-role-id]"); if (!choice) return; document.getElementById("newRole").value = choice.dataset.roleId; document.getElementById("selectedRoleName").textContent = choice.dataset.roleName; rolePickerModal.classList.remove("show"); });
document.addEventListener("keydown", (event) => { if (event.key === "Escape") rolePickerModal?.classList.remove("show"); });
=======
>>>>>>> a77ef059e85bdaf13eadf2dd59f745d0221b2dad
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
<<<<<<< HEAD

// ---------- Settings: change password ----------
const passwordForm = document.getElementById("passwordForm");
if (passwordForm) {
  passwordForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const currentPassword = document.getElementById("currentPassword").value;
    const newPassword = document.getElementById("newPasswordSettings").value;
    const passwordStatus = document.getElementById("passwordStatus");
    passwordStatus.className = "status";
    try {
      const res = await fetch("/api/me/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (data.ok) {
        passwordStatus.textContent = "Password updated.";
        passwordStatus.className = "status success";
        passwordForm.reset();
      } else {
        passwordStatus.textContent = data.message || "Failed to update password.";
        passwordStatus.className = "status error";
      }
    } catch {
      passwordStatus.textContent = "Connection error.";
      passwordStatus.className = "status error";
    }
  });
}

const profileForm = document.getElementById("profileForm");
profileForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = document.getElementById("avatarInput");
  const status = document.getElementById("profileStatus");
  if (!input.files[0]) { status.textContent = "Choose an image first."; status.className = "status error"; return; }
  const formData = new FormData();
  formData.append("avatar", input.files[0]);
  const saveButton = document.getElementById("saveAvatarBtn"); saveButton.classList.add("loading"); saveButton.disabled = true; saveButton.querySelector(".btn-label").textContent = "Saving profile...";
  let data; try { const res = await fetch("/api/me/avatar", { method: "POST", body: formData }); data = await res.json(); } catch { data = { ok: false, message: "Upload failed." }; }
  saveButton.classList.remove("loading"); saveButton.disabled = false; saveButton.classList.toggle("success", !!data.ok); saveButton.classList.toggle("error", !data.ok); saveButton.querySelector(".btn-label").textContent = data.ok ? "Profile saved" : "Upload failed";
  setTimeout(() => { saveButton.classList.remove("success", "error"); saveButton.querySelector(".btn-label").textContent = "Save profile photo"; }, 2200);
  status.textContent = data.ok ? "Profile photo updated." : (data.message || "Upload failed.");
  status.className = `status ${data.ok ? "success" : "error"}`;
  if (data.ok) { CURRENT_USER = data.user; applyProfile(CURRENT_USER); chatSocket?.emit("profile:updated", CURRENT_USER); }
});

const avatarInput = document.getElementById("avatarInput"); const filePicker = document.querySelector(".file-picker");
function previewAvatar(file) { if (!file || !file.type.startsWith("image/")) return; document.getElementById("avatarFileName").textContent = file.name; const previewUrl = URL.createObjectURL(file); document.getElementById("profileAvatar").innerHTML = `<img class="avatar-image" src="${previewUrl}" alt="Avatar preview" />`; }
avatarInput?.addEventListener("change", (event) => previewAvatar(event.target.files[0]));
filePicker?.addEventListener("dragover", (event) => { event.preventDefault(); filePicker.classList.add("drag-active"); });
filePicker?.addEventListener("dragleave", () => filePicker.classList.remove("drag-active"));
filePicker?.addEventListener("drop", (event) => { event.preventDefault(); filePicker.classList.remove("drag-active"); const file = event.dataTransfer.files[0]; previewAvatar(file); if (avatarInput && file) { const transfer = new DataTransfer(); transfer.items.add(file); avatarInput.files = transfer.files; } });
document.getElementById("removeAvatarBtn")?.addEventListener("click", async () => { const button = document.getElementById("removeAvatarBtn"); button.disabled = true; const res = await fetch("/api/me/avatar", { method: "DELETE" }); const data = await res.json(); button.disabled = false; if (!data.ok) return toast(data.message || "Could not remove avatar", "error"); CURRENT_USER = data.user; applyProfile(CURRENT_USER); document.getElementById("avatarFileName").textContent = "Choose an image"; avatarInput.value = ""; toast("Avatar removed"); });

document.querySelectorAll("input[name='theme']").forEach((input) => input.addEventListener("change", async () => {
  document.body.classList.remove("theme-transition"); void document.body.offsetWidth; document.body.classList.add("theme-transition");
  document.body.dataset.theme = input.value;
  const res = await fetch("/api/me/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ theme: input.value, accent: document.getElementById("accentColor")?.value, density: document.getElementById("densitySelect")?.value, motion: document.getElementById("motionToggle")?.checked }) });
  const data = await res.json();
  if (data.ok) { CURRENT_USER = data.user; chatSocket?.emit("profile:updated", CURRENT_USER); toast("Theme updated"); }
  else toast(data.message || "Theme update failed", "error");
}));
document.getElementById("avatarInput")?.addEventListener("change", (event) => { const file = event.target.files[0]; if (file) document.getElementById("avatarFileName").textContent = file.name; });
async function saveCustomization() { const accent = document.getElementById("accentColor").value; document.documentElement.style.setProperty("--green", accent); document.body.dataset.density = document.getElementById("densitySelect").value; document.body.classList.toggle("reduced-motion", !document.getElementById("motionToggle").checked); const res = await fetch("/api/me/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ theme: document.body.dataset.theme, accent, density: document.body.dataset.density, motion: document.getElementById("motionToggle").checked }) }); const data = await res.json(); if (data.ok) { CURRENT_USER = data.user; toast("Interface customized"); } else toast(data.message || "Customization failed", "error"); }
document.getElementById("accentColor")?.addEventListener("change", saveCustomization); document.getElementById("densitySelect")?.addEventListener("change", saveCustomization); document.getElementById("motionToggle")?.addEventListener("change", saveCustomization);

=======
>>>>>>> a77ef059e85bdaf13eadf2dd59f745d0221b2dad
