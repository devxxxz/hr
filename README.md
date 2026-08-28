<<<<<<< HEAD
# ShadowByte

Modern, mobile-responsive, role-based site: green/black theme with an Apple-style
"liquid glass" UI, animated background, login-gated dashboard, file/image/video
sharing, live chat, and Discord-style voice/video/screen-share calls.

## Features
- **Liquid glass UI**: frosted, blurred glass panels with specular highlight sheens,
  soft ambient glow orbs, and a green/black cyberpunk-SaaS palette. Buttons have an
  animated shine sweep. Fonts: Space Grotesk (display) + Inter (body) + JetBrains
  Mono (data/labels).
- **Animated background**: a live circuit-pulse network (nodes + traveling light
  pulses) rendered on canvas.
- **Login-gated**: `/` shows the login screen; anyone already logged in is sent
  straight to `/dashboard`. Anyone not logged in is bounced back to `/`.
- **Roles**: `owner` → `admin` → `member`. Only the owner can add/remove members
  and assign roles. The dashboard UI adapts to whoever is logged in.
- **Hidden credentials**: the owner username/password never appear in any code
  shipped to the browser — they live only in `.env` (git-ignored) as a bcrypt
  hash, read server-side only.
- **Settings**: every user can change their own password from the dashboard.
- **File sharing**: drag-and-drop upload for images, video, PDFs, docs, zip (up
  to 200MB/file). Click an image/video thumbnail to preview it full-size in a
  lightbox. Files are served through an authenticated endpoint, not a public
  folder.
- **Live chat**: real-time (Socket.IO), typing indicator, unread-message badge
  on the Chat tab, history persisted to disk.
- **Voice / video / screen-share calls (Discord-style)**: participant list
  showing everyone in the call with live speaking indicators (real audio-level
  detection), mic/camera/screen-share toggles, device selection (choose which
  mic/camera to use), and a spotlight view that automatically features whoever
  is sharing their screen for everyone in the call.
- **Graceful mic handling**: if microphone permission is denied or no mic is
  present, you can still join the call (to watch/listen/screen-share/chat)
  instead of being blocked outright — a banner explains what happened.
=======
# Hackers Residence (HR)

Modern, mobile-responsive, role-based site with a login-gated dashboard,
file/image/video sharing, and live chat.

## Features
- **Login-gated**: `/` shows the login screen; anyone already logged in is
  sent straight to `/dashboard`. Anyone not logged in is bounced back to `/`.
- **Roles**: `owner` → `admin` → `member`. Only the owner can add/remove
  members and assign roles. The dashboard UI adapts to whoever is logged in
  (e.g. the "Members" panel only appears for owner/admin).
- **Hidden credentials**: the owner username/password never appear in any
  code shipped to the browser. They live only in `.env` (git-ignored) as a
  **bcrypt hash** — not plaintext — and are read server-side only.
- **File sharing**: drag-and-drop upload for images, video, PDFs, docs, zip
  (up to 200MB/file). Files are served through an authenticated endpoint,
  not a public static folder — nobody can access them without logging in.
- **Live chat**: real-time chat (Socket.IO) tied to the same login session,
  with the last 200 messages persisted to disk.
- **Voice / video / screen-share calls**: any logged-in member can join the
  Call tab for live mic audio, webcam video, and screen sharing with
  everyone else currently in the call — no third-party service, runs over
  WebRTC with your own server doing the signaling.
- **Mobile-first UI**: collapsible sidebar/hamburger menu, responsive grid,
  works on phones and tablets as well as desktop.
>>>>>>> a77ef059e85bdaf13eadf2dd59f745d0221b2dad

## Local setup
```bash
npm install
npm start
```
Open http://localhost:3000

## Login
- Username: `primestark@1122`
- Password: `anzoamzohamzo`
(Owner account — only the owner can create admin/member accounts, from the
<<<<<<< HEAD
Members tab. Any user, including the owner, can change their own password
from the Settings tab — that persists across restarts.)

## Deploying to your domain
1. Upload this folder to your server (or `git clone` it there).
2. `npm install --production`
3. Edit `.env`:
   - Set `SESSION_SECRET` to a long random string.
   - Set `NODE_ENV=production`.
   - If serving over HTTPS behind a reverse proxy (recommended, and required
     for camera/mic/screen access on a real domain), also set
     `FORCE_HTTPS=true`.
4. Run it behind a reverse proxy (nginx/Caddy) that terminates TLS, or use a
   process manager like `pm2`:
   ```bash
   pm2 start server.js --name hackers-residence
   ```
5. Point your domain's DNS at the server, get a TLS cert, and proxy `/` →
   `http://localhost:3000`. Make sure WebSocket upgrade headers are proxied
   through (needed for chat and calls).
=======
Members tab in the dashboard.)

## Deploying to your domain

**Important — this will NOT run on Netlify.** Netlify only hosts static
files and short-lived serverless functions; it has no support for
persistent Node servers or WebSocket connections. This app needs both
(live chat and calls use Socket.IO, which requires a real, always-on
server process). Deploy it somewhere that runs Node continuously instead:

**Easiest — Render or Railway (both work like Netlify: push and deploy, free tier)**
1. Push this folder to a GitHub repo.
2. On [Render](https://render.com) or [Railway](https://railway.app): New →
   Web Service → connect the repo.
3. Build command: `npm install`. Start command: `npm start`.
4. Add environment variables from `.env` (see below) in their dashboard —
   don't commit your real `.env`.
5. They give you a `*.onrender.com` / `*.up.railway.app` URL immediately;
   point your domain's DNS (CNAME) at it and they'll issue TLS for you.

**Your own VPS (DigitalOcean, Hetzner, etc.)**
1. Upload this folder to your server (or `git clone` it there).
2. `npm install --production`
3. Edit `.env`:
   - Set `SESSION_SECRET` to a long random string (don't reuse the default).
   - Set `NODE_ENV=production`.
   - If serving over HTTPS behind a reverse proxy (recommended), also set
     `FORCE_HTTPS=true` so session cookies are marked `secure`.
4. Run it behind a reverse proxy (nginx/Caddy) that terminates TLS and
   forwards to the Node port, or use a process manager like `pm2`:
   ```bash
   pm2 start server.js --name hackers-residence
   ```
5. Point your domain's DNS at the server, get a TLS cert (e.g. `certbot` for
   nginx, or Caddy handles it automatically), and proxy `/` → `http://localhost:3000`.
   Make sure WebSocket upgrade headers are proxied through (needed for chat).
>>>>>>> a77ef059e85bdaf13eadf2dd59f745d0221b2dad

   Example nginx location block:
   ```nginx
   location / {
       proxy_pass http://localhost:3000;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection "upgrade";
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
   }
   ```

## Calls (voice / video / screen share)
<<<<<<< HEAD
- **Join Call**: connects you to everyone else currently in the call
  (peer-to-peer mesh). If mic access is denied or no mic exists, you still
  join — you just can't talk until that's fixed; you'll see a banner
  explaining why.
- **Mic / Camera**: toggle on/off. Device dropdowns next to Join Call let you
  pick which physical mic/camera to use (labels appear once permission is
  granted at least once).
- **Share Screen**: whoever shares becomes the large "spotlight" tile for
  everyone in the call automatically.
- **Browsers require HTTPS** for camera/mic/screen access on any domain other
  than `localhost` — this is a browser security rule, not something this app
  can bypass. Deploy behind TLS as above and it works normally.
- Uses a public STUN server for NAT traversal — enough for most networks. For
  very restrictive corporate firewalls you'd want to add a TURN server (e.g.
  coturn) and list it in `ICE_SERVERS` in `public/js/call.js`.
- Note on assets: this call UI is inspired by Discord's voice-channel UX
  (participant list, speaking indicators, mute/screen-share icons) but uses
  entirely original icons/styling — it doesn't use any of Discord's actual
  copyrighted assets.

## Adding more members
Log in as the owner → **Members** tab → fill in username/password/role →
**Add**.

## Data storage
- `data/users.json` — accounts (bcrypt-hashed passwords only)
=======
- Click **Join Call** in the Call tab — grants mic access and connects you
  to everyone else currently in the call (peer-to-peer, mesh topology).
- **Mic**: toggles your microphone on/off.
- **Camera**: turns your webcam on/off.
- **Share Screen**: shares your screen instead of your webcam feed; click
  again (or use the browser's native "Stop sharing" control) to switch back.
- **Browsers require HTTPS** for camera/mic/screen access on any domain
  other than `localhost`. Once you deploy behind a TLS-terminated reverse
  proxy (see below), this works normally.
- This uses a public STUN server for NAT traversal, which is enough for most
  home/office networks. If some people can't connect to each other (very
  restrictive corporate firewalls, symmetric NAT), you'd need to add a TURN
  server (e.g. [coturn](https://github.com/coturn/coturn)) and list it in
  the `ICE_SERVERS` array in `public/js/call.js`.
- Calls are mesh-based (every participant connects directly to every other
  participant), which works great for small groups (a handful of people).
  For large group calls you'd eventually want an SFU (e.g. mediasoup) —
  not included here, but the signaling server is a natural place to add one.

## Adding more members
Log in as the owner → **Members** tab → fill in username/password/role →
**Add**. Passwords are bcrypt-hashed before they're ever written to disk.

## Data storage
- `data/users.json` — accounts (hashed passwords only)
>>>>>>> a77ef059e85bdaf13eadf2dd59f745d0221b2dad
- `data/files.json` — file metadata
- `data/chat.json` — chat history (last 200 messages)
- `uploads/` — actual uploaded files (private, authenticated access only)

All of the above are git-ignored so they don't leak into version control.

## Security notes
- Passwords are always bcrypt-hashed, never stored or logged in plaintext.
<<<<<<< HEAD
- `.env` is git-ignored — don't commit it, and rotate `SESSION_SECRET` before
  going live.
- Per-IP brute-force throttle on `/api/login` (5 attempts / 10 min).
- File downloads/streams, chat, and calls all require a valid session.
=======
- `.env` (which holds the owner's hash and session secret) is git-ignored —
  don't commit it, and rotate `SESSION_SECRET` before going live.
- Per-IP brute-force throttle on `/api/login` (5 attempts / 10 min).
- File downloads/streams and chat both require a valid session — there's no
  publicly browsable folder of uploads.
>>>>>>> a77ef059e85bdaf13eadf2dd59f745d0221b2dad
