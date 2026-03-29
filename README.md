# Serene Frontend

Hackathon build of **Serene** — a calm, “life agent” chat experience with **text + voice** conversations, session history, and a lightweight RPG-style HUD.

Built with **Vite + React + Chakra UI**.

## Team

- Sandesh Gyawali
- Alina Chudali
- Baibhav Paudel
- Avis Shrestha
- Keshab Shrestha

## What’s inside (quick)

- Text chat + session history (ChatGPT-style list)
- Voice capture with silence auto-send + playback
- User stats / progress panels (HUD)

## Requirements

- Node.js 18+ (recommended)
- npm

## Setup (local)

```bash
cd hack-front
npm install
```

Create an env file:

```bash
cp .env.example .env
```

### Configure API URLs

Edit `.env` and set at least:

- `VITE_API_URL` → Serene backend base (ends with `/api/v1`)
- `VITE_CHAT_SERVER_URL` → chat server base (serves `/v1/...`)

Example for local backend on port 8000:

```bash
VITE_API_URL=http://127.0.0.1:8000/api/v1
VITE_CHAT_SERVER_URL=http://127.0.0.1:8000
```

### Run

```bash
cd hack-front
npm run dev
```

Vite will start on `http://localhost:5173`.

## Environment variables (notes)

Frontend config is read via `import.meta.env.*` (Vite).

- The app talks to two API prefixes:
  - `/api/v1/...` for Serene app APIs (user/progress/sessions/voice)
  - `/v1/...` for OpenAI-compatible chat + session endpoints
- In dev, `vite.config.js` can proxy `/v1/*` to `VITE_CHAT_SERVER_URL`.

## Scripts

```bash
npm run dev       # start dev server
npm run build     # production build
npm run preview   # preview production build
```

## Key files (entry points)

- `src/pages/chat.jsx` — main chat UI (text + voice + sessions list)
- `src/components/VoiceRecorderButton.jsx` — mic recording + silence detection + auto-send
- `src/components/VoiceMessageBubble.jsx` — voice playback UI
- `index.html` / `public/manifest.json` — app name/metadata
 
