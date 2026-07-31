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
- `data/files.json` — file metadata
- `data/chat.json` — chat history (last 200 messages)
- `uploads/` — actual uploaded files (private, authenticated access only)

All of the above are git-ignored so they don't leak into version control.

## Security notes
- Passwords are always bcrypt-hashed, never stored or logged in plaintext.
- `.env` (which holds the owner's hash and session secret) is git-ignored —
  don't commit it, and rotate `SESSION_SECRET` before going live.
- Per-IP brute-force throttle on `/api/login` (5 attempts / 10 min).
- File downloads/streams and chat both require a valid session — there's no
  publicly browsable folder of uploads.
