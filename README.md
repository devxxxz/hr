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
- `data/files.json` — file metadata
- `data/chat.json` — chat history (last 200 messages)
- `uploads/` — actual uploaded files (private, authenticated access only)

All of the above are git-ignored so they don't leak into version control.

## Security notes
- Passwords are always bcrypt-hashed, never stored or logged in plaintext.
- `.env` is git-ignored — don't commit it, and rotate `SESSION_SECRET` before
  going live.
- Per-IP brute-force throttle on `/api/login` (5 attempts / 10 min).
- File downloads/streams, chat, and calls all require a valid session.
