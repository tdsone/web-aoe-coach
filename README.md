# AoE2 Replay Parser

Upload and parse Age of Empires II replay files (.aoe2record).

## Setup & Run

### Requirements
- Node
- uv: https://docs.astral.sh/uv/getting-started/installation/

### Server (FastAPI)

```bash
cd server
uv sync
uv run uvicorn main:app --reload
```

Runs on http://localhost:8000

### Client (React + Vite)

```bash
cd client
npm install
npm run dev
```

Runs on http://localhost:5173

