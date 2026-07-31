(() => {
  const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

  const joinBtn = document.getElementById("joinCallBtn");
  const leaveBtn = document.getElementById("leaveCallBtn");
  const micBtn = document.getElementById("micBtn");
  const camBtn = document.getElementById("camBtn");
  const screenBtn = document.getElementById("screenBtn");
  const callStatus = document.getElementById("callStatus");
  const videoGrid = document.getElementById("videoGrid");
  const callBadge = document.getElementById("callBadge");

  let callSocket = null;
  let localStream = null;
  let screenStream = null;
  let inCall = false;
  let micOn = true;
  let camOn = false;
  let sharingScreen = false;

  // socketId -> { pc: RTCPeerConnection, username, role }
  const peers = new Map();

  function setStatus(text) { callStatus.textContent = text; }

  function ensureTile(id, { username, isLocal } = {}) {
    let tile = document.getElementById(`tile-${id}`);
    if (tile) return tile;
    tile = document.createElement("div");
    tile.className = "video-tile";
    tile.id = `tile-${id}`;
    const initial = (username || "?").charAt(0).toUpperCase();
    tile.innerHTML = `
      <video autoplay playsinline ${isLocal ? "muted" : ""}></video>
      <div class="avatar-fallback">${initial}</div>
      <div class="tile-label">
        <span class="name">${username || "you"}${isLocal ? " (you)" : ""}</span>
        <span class="mic-off" style="display:none">🔇</span>
        <span class="screen-tag" style="display:none">🖥️</span>
      </div>
    `;
    tile.addEventListener("click", async () => {
      const video = tile.querySelector("video");
      if (!video || !video.srcObject) return;
      if (document.fullscreenElement === tile) {
        await document.exitFullscreen().catch(() => {});
      } else if (tile.requestFullscreen) {
        await tile.requestFullscreen().catch(() => {
          tile.classList.toggle("fullscreen-fallback");
        });
      } else {
        tile.classList.toggle("fullscreen-fallback");
      }
    });

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

  function setMicIndicator(id, muted) {
    const tile = document.getElementById(`tile-${id}`);
    if (!tile) return;
    tile.querySelector(".mic-off").style.display = muted ? "inline" : "none";
  }

  function setScreenIndicator(id, sharing) {
    const tile = document.getElementById(`tile-${id}`);
    if (!tile) return;
    tile.querySelector(".screen-tag").style.display = sharing ? "inline" : "none";
  }

  // ---------------- peer connection management ----------------
  function createPeerConnection(peerId, meta = {}) {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    peers.set(peerId, { pc, ...meta });

    if (localStream) {
      localStream.getAudioTracks().forEach((track) => pc.addTrack(track, localStream));
      if (!sharingScreen && localStream.getVideoTracks().length > 0) {
        pc.addTrack(localStream.getVideoTracks()[0], localStream);
      }
    }

    if (sharingScreen && screenStream) {
      const screenTrack = screenStream.getVideoTracks()[0];
      if (screenTrack) pc.addTrack(screenTrack, screenStream);
    }

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        callSocket.emit("call:signal", { to: peerId, type: "candidate", payload: e.candidate });
      }
    };

    pc.onnegotiationneeded = async () => {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        callSocket.emit("call:signal", { to: peerId, type: "offer", payload: offer });
      } catch (err) {
        console.error("Negotiation failed:", err);
      }
    };

    pc.ontrack = (e) => {
      const [stream] = e.streams;
      attachStream(peerId, stream, { hasVideo: stream.getVideoTracks().length > 0 });
    };

    pc.onconnectionstatechange = () => {
      if (["failed", "closed", "disconnected"].includes(pc.connectionState)) {
        // leave cleanup to call:peer-left; this just guards stale tiles
      }
    };

    return pc;
  }

  async function connectToPeer(peerId, meta) {
    const pc = createPeerConnection(peerId, meta);
    ensureTile(peerId, { username: meta.username });
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    callSocket.emit("call:signal", { to: peerId, type: "offer", payload: offer });
  }

  async function handleSignal({ from, type, payload }) {
    let entry = peers.get(from);
    if (!entry) {
      const pc = createPeerConnection(from, {});
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
      try {
        await pc.addIceCandidate(new RTCIceCandidate(payload));
      } catch {
        /* ignore late candidates */
      }
    }
  }

  function closePeer(peerId) {
    const entry = peers.get(peerId);
    if (entry) {
      entry.pc.close();
      peers.delete(peerId);
    }
    removeTile(peerId);
  }

  function closeAllPeers() {
    for (const id of Array.from(peers.keys())) closePeer(id);
  }

  // ---------------- media controls ----------------
  function formatMediaError(err) {
    if (!err) return "Media permission denied";
    if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
      return "Microphone permission is required to join the call. Please allow access in your browser settings.";
    }
    if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
      return "No microphone was found. Please connect a microphone and try again.";
    }
    return err.message || "Unable to access media devices.";
  }

  async function getMic() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("Media devices are not supported by this browser.");
    }
    if (!localStream) {
      localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    }
    return localStream;
  }

  async function initLocalStream() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("Media devices are not supported by this browser.");
    }

    try {
      await getMic();
      micOn = true;
      return { noMic: false };
    } catch (err) {
      const noMicError = ["NotAllowedError", "PermissionDeniedError", "NotFoundError", "DevicesNotFoundError"].includes(err.name);
      if (noMicError) {
        localStream = new MediaStream();
        micOn = false;
        return { noMic: true, error: err };
      }
      throw err;
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
    if (!localStream) return;
    micOn = !micOn;
    localStream.getAudioTracks().forEach((t) => (t.enabled = micOn));
    micBtn.classList.toggle("active-toggle", micOn);
    micBtn.textContent = micOn ? "🎤 Mic" : "🔇 Muted";
    setMicIndicator("local", !micOn);
  });

  camBtn.addEventListener("click", async () => {
    if (!inCall) return;
    if (!camOn) {
      try {
        const camStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const videoTrack = camStream.getVideoTracks()[0];
        localStream.addTrack(videoTrack);
        replaceOutgoingTrack("video", videoTrack);
        attachStream("local", localStream, { hasVideo: true });
        camOn = true;
        camBtn.classList.add("active-toggle");
        camBtn.textContent = "📷 Stop Camera";
      } catch (err) {
        toast("Camera permission denied", "error");
      }
    } else {
      localStream.getVideoTracks().forEach((t) => { t.stop(); localStream.removeTrack(t); });
      replaceOutgoingTrack("video", null);
      attachStream("local", localStream, { hasVideo: false });
      camOn = false;
      camBtn.classList.remove("active-toggle");
      camBtn.textContent = "📷 Camera";
    }
  });

  screenBtn.addEventListener("click", async () => {
    if (!inCall) return;
    if (!sharingScreen) {
      try {
        screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        const screenTrack = screenStream.getVideoTracks()[0];
        replaceOutgoingTrack("video", screenTrack);
        attachStream("local", screenStream, { hasVideo: true });
        setScreenIndicator("local", true);
        sharingScreen = true;
        screenBtn.classList.add("active-toggle");
        screenBtn.textContent = "🖥️ Stop Sharing";
        screenTrack.onended = () => stopScreenShare();
      } catch {
        toast("Screen share cancelled", "error");
      }
    } else {
      stopScreenShare();
    }
  });

  function stopScreenShare() {
    if (screenStream) screenStream.getTracks().forEach((t) => t.stop());
    screenStream = null;
    sharingScreen = false;
    setScreenIndicator("local", false);
    screenBtn.classList.remove("active-toggle");
    screenBtn.textContent = "🖥️ Share Screen";
    const camTrack = camOn ? localStream.getVideoTracks()[0] : null;
    replaceOutgoingTrack("video", camTrack || null);
    attachStream("local", localStream, { hasVideo: camOn });
  }

  // ---------------- join / leave ----------------
  joinBtn.addEventListener("click", async () => {
    let streamResult;
    try {
      streamResult = await initLocalStream();
    } catch (err) {
      toast(formatMediaError(err), "error");
      return;
    }

    if (streamResult && streamResult.noMic) {
      toast("Joined call without microphone. Tap screen share to broadcast your display.", "warning");
    }

    callSocket = io();
    inCall = true;

    const currentUser = typeof CURRENT_USER !== "undefined" ? CURRENT_USER : null;
    ensureTile("local", { username: (currentUser && currentUser.username) || "you", isLocal: true });
    attachStream("local", localStream, { hasVideo: false });

    micBtn.classList.toggle("active-toggle", micOn);
    micBtn.textContent = micOn ? "🎤 Mic" : "🔇 No Mic";

    callSocket.on("connect", () => {
      callSocket.emit("call:join");
      setStatus("Connected");
      callBadge.style.display = "inline";
    });

    callSocket.on("call:peers", (existingPeers) => {
      existingPeers.forEach((p) => connectToPeer(p.socketId, { username: p.username, role: p.role }));
    });

    callSocket.on("call:peer-joined", (p) => {
      ensureTile(p.socketId, { username: p.username });
      toast(`${p.username} joined the call`);
    });

    callSocket.on("call:signal", handleSignal);

    callSocket.on("call:peer-left", ({ socketId }) => {
      closePeer(socketId);
    });

    joinBtn.style.display = "none";
    leaveBtn.style.display = "inline-block";
    micBtn.disabled = false;
    camBtn.disabled = false;
    screenBtn.disabled = false;
    micBtn.classList.add("active-toggle");
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
    if (localStream) localStream.getTracks().forEach((t) => t.stop());
    if (screenStream) screenStream.getTracks().forEach((t) => t.stop());
    localStream = null;
    screenStream = null;
    removeTile("local");
    inCall = false;
    camOn = false;
    sharingScreen = false;
    micOn = true;

    joinBtn.style.display = "inline-block";
    leaveBtn.style.display = "none";
    micBtn.disabled = true;
    camBtn.disabled = true;
    screenBtn.disabled = true;
    micBtn.classList.remove("active-toggle");
    camBtn.classList.remove("active-toggle");
    screenBtn.classList.remove("active-toggle");
    micBtn.textContent = "🎤 Mic";
    camBtn.textContent = "📷 Camera";
    screenBtn.textContent = "🖥️ Share Screen";
    setStatus("Not connected");
    callBadge.style.display = "none";
  }

  window.addEventListener("beforeunload", () => {
    if (inCall) leaveCall();
  });
})();
