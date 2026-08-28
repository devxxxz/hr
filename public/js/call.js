(() => {
  const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

  const joinBtn = document.getElementById("joinCallBtn");
  const leaveBtn = document.getElementById("leaveCallBtn");
  const micBtn = document.getElementById("micBtn");
  const camBtn = document.getElementById("camBtn");
  const screenBtn = document.getElementById("screenBtn");
  const callStatus = document.getElementById("callStatus");
  const callNotice = document.getElementById("callNotice");
  const videoGrid = document.getElementById("videoGrid");
  const callBadge = document.getElementById("callBadge");
  const vcList = document.getElementById("vcParticipantList");
  const vcCount = document.getElementById("vcCount");
  const micSelect = document.getElementById("micSelect");
  const camSelect = document.getElementById("camSelect");

  const ICONS = {
    micOff: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3l18 18M9 9v1a3 3 0 0 0 4.6 2.5M15 6a3 3 0 0 0-5.7-1.3M5 11a7 7 0 0 0 10.3 6.1M19 11a7 7 0 0 1-1 3.6M12 18v3"/></svg>`,
    screen: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>`,
  };

  let callSocket = null;
  let localStream = null;
  let screenStream = null;
  let inCall = false;
  let micOn = false;   // becomes true only if we actually got a mic track
  let hasMic = false;
  let camOn = false;
  let sharingScreen = false;

  const peers = new Map();
  const speakingWatchers = new Map();

  function setStatus(text) { callStatus.textContent = text; }
  function showNotice(text) {
    if (!text) { callNotice.style.display = "none"; return; }
    callNotice.textContent = text;
    callNotice.style.display = "block";
  }

  function broadcastState() {
    if (callSocket) callSocket.emit("call:state", { micOn, camOn, sharingScreen });
  }

  // ---------------- device list ----------------
  async function populateDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const mics = devices.filter((d) => d.kind === "audioinput");
      const cams = devices.filter((d) => d.kind === "videoinput");
      micSelect.innerHTML = mics.length
        ? mics.map((d, i) => `<option value="${d.deviceId}">${d.label || "Microphone " + (i + 1)}</option>`).join("")
        : `<option value="">No microphone found</option>`;
      camSelect.innerHTML = cams.length
        ? cams.map((d, i) => `<option value="${d.deviceId}">${d.label || "Camera " + (i + 1)}</option>`).join("")
        : `<option value="">No camera found</option>`;
    } catch {
      /* enumerateDevices unsupported/blocked — leave selects empty */
    }
  }
  populateDevices();
  navigator.mediaDevices?.addEventListener?.("devicechange", populateDevices);

  // ---------------- participant list ----------------
  function renderParticipants() {
    const all = [{ id: "local", username: (CURRENT_USER && CURRENT_USER.username) || "you", avatarUrl: CURRENT_USER && CURRENT_USER.avatarUrl, isLocal: true, micOn, camOn, sharingScreen }];
    for (const [id, p] of peers) all.push({ id, username: p.username, avatarUrl: p.avatarUrl, micOn: p.micOn, camOn: p.camOn, sharingScreen: p.sharingScreen });

    vcCount.textContent = inCall ? all.length : 0;

    if (!inCall) {
      vcList.innerHTML = `<p class="vc-empty-hint">Nobody's here yet. Join to start a call.</p>`;
      return;
    }

    vcList.innerHTML = all.map((p) => `
      <div class="vc-person" id="vcp-${p.id}">
        <div class="vc-avatar">${p.avatarUrl ? `<img src="${p.avatarUrl}" alt="" />` : (p.username || "?").charAt(0).toUpperCase()}</div>
        <div class="vc-name">${p.username}${p.isLocal ? " (you)" : ""}</div>
        <div class="vc-icons">
          ${!p.micOn ? `<span class="off" title="Muted / no mic">${ICONS.micOff}</span>` : ""}
          ${p.sharingScreen ? `<span class="sharing" title="Sharing screen">${ICONS.screen}</span>` : ""}
        </div>
      </div>
    `).join("");
  }

  function setSpeaking(id, speaking) {
    const person = document.getElementById(`vcp-${id}`);
    if (person) person.classList.toggle("speaking", speaking);
    const tile = document.getElementById(`tile-${id}`);
    if (tile) tile.classList.toggle("speaking", speaking);
  }

  function watchSpeaking(id, stream) {
    stopWatching(id);
    const audioTracks = stream.getAudioTracks();
    if (!audioTracks.length) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      let speaking = false;
      let raf = null;
      const tick = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        const isSpeaking = avg > 12;
        if (isSpeaking !== speaking) {
          speaking = isSpeaking;
          setSpeaking(id, speaking);
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      speakingWatchers.set(id, () => {
        cancelAnimationFrame(raf);
        ctx.close().catch(() => {});
        setSpeaking(id, false);
      });
    } catch {
      /* Web Audio unsupported — skip speaking indicator */
    }
  }

  function stopWatching(id) {
    const cleanup = speakingWatchers.get(id);
    if (cleanup) { cleanup(); speakingWatchers.delete(id); }
  }

  function ensureTile(id, { username, isLocal, avatarUrl } = {}) {
    let tile = document.getElementById(`tile-${id}`);
    if (tile) return tile;
    tile = document.createElement("div");
    tile.className = "video-tile";
    tile.id = `tile-${id}`;
    const initial = (username || "?").charAt(0).toUpperCase();
    const tileAvatarUrl = isLocal && CURRENT_USER ? CURRENT_USER.avatarUrl : avatarUrl || "";
    tile.innerHTML = `
      <video autoplay playsinline ${isLocal ? "muted" : ""}></video>
      <div class="avatar-fallback">${tileAvatarUrl ? `<img src="${tileAvatarUrl}" alt="" />` : initial}</div>
      <div class="tile-label">
        <span class="name">${username || "you"}${isLocal ? " (you)" : ""}</span>
        <span class="mic-off" style="display:none">${ICONS.micOff}</span>
        <span class="screen-tag" style="display:none">${ICONS.screen}</span>
      </div>
    `;
    videoGrid.appendChild(tile);
    return tile;
  }

  function removeTile(id) {
    const tile = document.getElementById(`tile-${id}`);
    if (tile) tile.remove();
  }

  function attachStream(id, stream, { hasVideo } = {}) {
    const tile = ensureTile(id);
    const video = tile.querySelector("video");
    video.srcObject = stream;
    tile.classList.toggle("has-video", !!hasVideo);
  }

  function setTileMic(id, muted) {
    const tile = document.getElementById(`tile-${id}`);
    if (tile) tile.querySelector(".mic-off").style.display = muted ? "inline-flex" : "none";
  }

  function setTileScreen(id, sharing) {
    const tile = document.getElementById(`tile-${id}`);
    if (tile) tile.querySelector(".screen-tag").style.display = sharing ? "inline-flex" : "none";
  }

  function refreshSpotlight() {
    const sharingEntry = [...peers.entries()].find(([, p]) => p.sharingScreen);
    const sharingId = sharingScreen ? "local" : (sharingEntry ? sharingEntry[0] : null);
    videoGrid.classList.toggle("spotlight-mode", !!sharingId);
    videoGrid.querySelectorAll(".video-tile").forEach((t) => {
      t.classList.toggle("spotlight", !!sharingId && t.id === `tile-${sharingId}`);
    });
  }

  function createPeerConnection(peerId, meta = {}) {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    peers.set(peerId, { pc, username: meta.username, avatarUrl: meta.avatarUrl, role: meta.role, micOn: true, camOn: false, sharingScreen: false });

    if (localStream) {
      localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
    }

    pc.onicecandidate = (e) => {
      if (e.candidate) callSocket.emit("call:signal", { to: peerId, type: "candidate", payload: e.candidate });
    };

    pc.ontrack = (e) => {
      const [stream] = e.streams;
      attachStream(peerId, stream, { hasVideo: stream.getVideoTracks().length > 0 });
      watchSpeaking(peerId, stream);
    };

    let negotiating = false;
    pc.onnegotiationneeded = async () => {
      if (negotiating) return;
      negotiating = true;
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        callSocket.emit("call:signal", { to: peerId, type: "offer", payload: offer });
      } catch {
        /* ignore */
      } finally {
        negotiating = false;
      }
    };

    return pc;
  }

  async function connectToPeer(peerId, meta) {
    const pc = createPeerConnection(peerId, meta);
    ensureTile(peerId, { username: meta.username, avatarUrl: meta.avatarUrl });
    if (meta.state) applyRemoteState(peerId, meta.state);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    callSocket.emit("call:signal", { to: peerId, type: "offer", payload: offer });
  }

  async function handleSignal({ from, type, payload }) {
    let entry = peers.get(from);
    if (!entry) {
      createPeerConnection(from, {});
      entry = peers.get(from);
    }
    const { pc } = entry;

    if (type === "offer") {
      await pc.setRemoteDescription(new RTCSessionDescription(payload));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      callSocket.emit("call:signal", { to: from, type: "answer", payload: answer });
    } else if (type === "answer") {
      await pc.setRemoteDescription(new RTCSessionDescription(payload));
    } else if (type === "candidate") {
      try { await pc.addIceCandidate(new RTCIceCandidate(payload)); } catch { /* late candidate */ }
    }
  }

  function applyRemoteState(peerId, state) {
    const entry = peers.get(peerId);
    if (!entry) return;
    entry.micOn = !!state.micOn;
    entry.camOn = !!state.camOn;
    entry.sharingScreen = !!state.sharingScreen;
    setTileMic(peerId, !entry.micOn);
    setTileScreen(peerId, entry.sharingScreen);
    renderParticipants();
    refreshSpotlight();
  }

  function closePeer(peerId) {
    const entry = peers.get(peerId);
    if (entry) { entry.pc.close(); peers.delete(peerId); }
    stopWatching(peerId);
    removeTile(peerId);
    renderParticipants();
    refreshSpotlight();
  }

  function closeAllPeers() {
    for (const id of Array.from(peers.keys())) closePeer(id);
  }

  // ---------------- media: graceful mic acquisition ----------------
  // Returns a (possibly empty) MediaStream — never throws for permission/device
  // issues, so joining a call never hard-blocks on mic access.
  async function acquireLocalStream() {
    if (!window.isSecureContext) {
      showNotice("Mic/camera need HTTPS (or localhost). You can still join to watch, screen share won't work without it either.");
      return new MediaStream();
    }
    try {
      const constraints = micSelect.value ? { audio: { deviceId: { exact: micSelect.value } }, video: false } : { audio: true, video: false };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      hasMic = true;
      micOn = true;
      showNotice(null);
      return stream;
    } catch (err) {
      hasMic = false;
      micOn = false;
      if (err && err.name === "NotFoundError") {
        showNotice("No microphone detected — you joined without audio. You can still see/hear others and use chat.");
      } else {
        showNotice("Microphone access was blocked — you joined without audio. Allow mic access in your browser's site settings to talk.");
      }
      return new MediaStream();
    }
  }

  function replaceOutgoingTrack(kind, newTrack) {
    for (const { pc } of peers.values()) {
      const sender = pc.getSenders().find((s) => s.track && s.track.kind === kind);
      if (sender) sender.replaceTrack(newTrack);
      else if (newTrack) pc.addTrack(newTrack, localStream);
    }
  }

  micBtn.addEventListener("click", () => {
    if (!localStream || !hasMic) return;
    micOn = !micOn;
    localStream.getAudioTracks().forEach((t) => (t.enabled = micOn));
    micBtn.classList.toggle("active-toggle", micOn);
    micBtn.classList.toggle("muted-state", !micOn);
    setTileMic("local", !micOn);
    renderParticipants();
    broadcastState();
  });

  camBtn.addEventListener("click", async () => {
    if (!inCall) return;
    if (!camOn) {
      try {
        const constraints = camSelect.value ? { video: { deviceId: { exact: camSelect.value } } } : { video: true };
        const camStream = await navigator.mediaDevices.getUserMedia(constraints);
        const videoTrack = camStream.getVideoTracks()[0];
        localStream.addTrack(videoTrack);
        replaceOutgoingTrack("video", videoTrack);
        attachStream("local", localStream, { hasVideo: true });
        camOn = true;
        camBtn.classList.add("active-toggle");
      } catch {
        toast("Camera permission denied or unavailable", "error");
        return;
      }
    } else {
      localStream.getVideoTracks().forEach((t) => { t.stop(); localStream.removeTrack(t); });
      if (!sharingScreen) replaceOutgoingTrack("video", null);
      attachStream("local", localStream, { hasVideo: sharingScreen });
      camOn = false;
      camBtn.classList.remove("active-toggle");
    }
    renderParticipants();
    broadcastState();
  });

  screenBtn.addEventListener("click", async () => {
    if (!inCall) return;
    if (!sharingScreen) {
      try {
        screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        const screenTrack = screenStream.getVideoTracks()[0];
        replaceOutgoingTrack("video", screenTrack);
        attachStream("local", screenStream, { hasVideo: true });
        setTileScreen("local", true);
        sharingScreen = true;
        screenBtn.classList.add("active-toggle");
        screenTrack.onended = () => stopScreenShare();
      } catch {
        toast("Screen share cancelled", "error");
        return;
      }
    } else {
      stopScreenShare();
    }
    renderParticipants();
    refreshSpotlight();
    broadcastState();
  });

  function stopScreenShare() {
    if (screenStream) screenStream.getTracks().forEach((t) => t.stop());
    screenStream = null;
    sharingScreen = false;
    setTileScreen("local", false);
    screenBtn.classList.remove("active-toggle");
    const camTrack = camOn ? localStream.getVideoTracks()[0] : null;
    replaceOutgoingTrack("video", camTrack || null);
    attachStream("local", localStream, { hasVideo: camOn });
    renderParticipants();
    refreshSpotlight();
    broadcastState();
  }

  joinBtn.addEventListener("click", async () => {
    localStream = await acquireLocalStream();
    populateDevices(); // labels only appear after permission is granted

    callSocket = io();
    inCall = true;

    ensureTile("local", { username: (CURRENT_USER && CURRENT_USER.username) || "you", isLocal: true });
    attachStream("local", localStream, { hasVideo: false });
    if (hasMic) watchSpeaking("local", localStream);
    renderParticipants();

    callSocket.on("connect", () => {
      callSocket.emit("call:join");
      setStatus("Connected");
      callBadge.style.display = "inline";
    });

    callSocket.on("call:peers", (existingPeers) => {
      existingPeers.forEach((p) => connectToPeer(p.socketId, { username: p.username, avatarUrl: p.avatarUrl, role: p.role, state: p.state }));
    });

    callSocket.on("call:peer-joined", (p) => {
      ensureTile(p.socketId, { username: p.username, avatarUrl: p.avatarUrl });
      if (!peers.has(p.socketId)) peers.set(p.socketId, { username: p.username, avatarUrl: p.avatarUrl, role: p.role, micOn: true, camOn: false, sharingScreen: false });
      renderParticipants();
      toast(`${p.username} joined the call`);
    });

    callSocket.on("call:signal", handleSignal);
    callSocket.on("call:state", ({ socketId, state }) => applyRemoteState(socketId, state));
    callSocket.on("profile:updated", (profile) => {
      for (const entry of peers.values()) {
        if (entry.username === profile.username) entry.avatarUrl = profile.avatarUrl;
      }
      for (const entry of peers.values()) {
        const tile = [...videoGrid.querySelectorAll(".video-tile")].find((candidate) => candidate.querySelector(".name")?.textContent.startsWith(profile.username));
        if (tile) {
          const fallback = tile.querySelector(".avatar-fallback");
          fallback.innerHTML = profile.avatarUrl ? `<img src="${profile.avatarUrl}" alt="" />` : profile.username.charAt(0).toUpperCase();
        }
      }
      renderParticipants();
    });
    callSocket.on("call:peer-left", ({ socketId }) => closePeer(socketId));

    joinBtn.style.display = "none";
    leaveBtn.style.display = "inline-flex";
    micBtn.disabled = !hasMic;
    camBtn.disabled = false;
    screenBtn.disabled = false;
    if (hasMic) micBtn.classList.add("active-toggle");
    else setTileMic("local", true);
  });

  leaveBtn.addEventListener("click", leaveCall);

  function leaveCall() {
    if (!inCall) return;
    if (callSocket) {
      callSocket.emit("call:leave");
      callSocket.disconnect();
      callSocket = null;
    }
    closeAllPeers();
    stopWatching("local");
    if (localStream) localStream.getTracks().forEach((t) => t.stop());
    if (screenStream) screenStream.getTracks().forEach((t) => t.stop());
    localStream = null;
    screenStream = null;
    removeTile("local");
    inCall = false;
    camOn = false;
    sharingScreen = false;
    micOn = false;
    hasMic = false;

    joinBtn.style.display = "inline-flex";
    leaveBtn.style.display = "none";
    micBtn.disabled = true;
    camBtn.disabled = true;
    screenBtn.disabled = true;
    micBtn.classList.remove("active-toggle", "muted-state");
    camBtn.classList.remove("active-toggle");
    screenBtn.classList.remove("active-toggle");
    videoGrid.classList.remove("spotlight-mode");
    setStatus("Not connected");
    showNotice(null);
    callBadge.style.display = "none";
    renderParticipants();
  }

  window.addEventListener("beforeunload", () => { if (inCall) leaveCall(); });
})();
