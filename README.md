# 🏏 IPL Super Auction - Real-Time Multiplayer Web App

Production-ready, real-time multiplayer IPL-style cricket auction web application where friends can play together in private rooms.

---

## 🚀 Quick Start (Local Setup)

### Option A: standard npm
1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Build shared library & push database schema**:
   ```bash
   npm run dev:shared
   npm run db:push --prefix apps/server
   ```

3. **Seed database with 350 realistic cricket players**:
   ```bash
   npm run seed
   ```

4. **Run Dev Servers (Web + Backend)**:
   ```bash
   npm run dev
   ```
   - **Frontend**: http://localhost:3000
   - **Backend Server**: http://localhost:4000

---

### Option B: Docker Compose
```bash
docker-compose up --build
```

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Lucide Icons, Canvas Confetti, Web Audio API (Synthesized SFX).
- **Backend**: Node.js, Express, Socket.IO, TypeScript.
- **Database**: SQLite / PostgreSQL via Prisma ORM.
- **State Store**: Clean `IRoomStore` abstraction (In-memory default with Redis readiness).
- **Single Source of Truth**: Timers, bid queue locks, purse limits, and state machines are fully calculated and synchronized on the backend server.

---

## 📝 How to Add or Modify Players

1. Open `apps/server/src/seed/seed-data-builder.ts` or add custom entries to `STAR_PLAYERS`.
2. Re-run `npm run seed`.

---

## ☁️ 24/7 Free Cloud Deployment Guide (Play Anytime Without Keeping PC On)

You can host this game on free cloud platforms so you and your friends can play anytime 24/7 without needing your personal laptop or server running:

### Option 1: One-Click / GitHub Deploy with Render (Free 24/7)
1. Push this repository to your **GitHub** account:
   ```bash
   git init
   git add .
   git commit -m "feat: IPL Auction with sessions and host kick feature"
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git push -u origin main
   ```
2. Go to [Render.com](https://render.com) (sign up free with GitHub).
3. Click **New +** -> **Blueprint**.
4. Select your GitHub repository. Render will automatically read [`render.yaml`](file:///d:/auction/render.yaml) and spin up:
   - **Backend Server** (`ipl-auction-server`) on Socket.IO / Node.js
   - **Frontend Web Client** (`ipl-auction-web`) on Next.js
5. Click **Apply**. Once deployed, Render gives you a live public URL (e.g., `https://ipl-auction-web.onrender.com`) that anyone can open and play on phone or PC anytime!

---

### Option 2: Railway (Fastest All-in-One Deployment)
1. Go to [Railway.app](https://railway.app).
2. Click **New Project** -> **Deploy from GitHub repo**.
3. Railway will deploy the application directly using the built-in Dockerfile / Nixpacks configuration.
4. Add a public domain under service **Settings** -> **Networking** -> **Generate Domain**.

---

### Option 3: Vercel (Frontend) + Render / Railway (Backend)
- **Backend (Render / Railway)**:
  - Root directory: `apps/server` (or monorepo root with `npm run start --prefix apps/server`)
  - Copy your deployed backend URL (e.g. `https://my-auction-server.onrender.com`).
- **Frontend (Vercel)**:
  - Deploy `apps/web` on [Vercel](https://vercel.com).
  - Add Environment Variable: `NEXT_PUBLIC_SERVER_URL=https://my-auction-server.onrender.com`
  - Deploy!

---

## 🛡️ Host Moderation & Session Features
- **Host Kick / Remove**: The room host can remove any misbehaving player at any time from both the Lobby and the Live Auction screen. Their team is gracefully converted to an AI Bot so the auction never breaks.
- **Session Persistence & Reconnection**: Players who close their tab, lose Wi-Fi, or switch apps can return to the room URL anytime and instantly rejoin their session with their squad, purse, and team intact.

