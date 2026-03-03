# 💬 Chat Vibe — WhatsApp Wrapped

> *"Spotify Wrapped, but for your group chat."*

**Chat Vibe** is a full-stack web app that transforms a raw WhatsApp `.txt` export into a beautiful, animated analytics dashboard — complete with activity heatmaps, emoji leaderboards, and 8 hilariously accurate "Hall of Shame" awards.

---

## ✨ Features

| Feature | Description |
|---|---|
| **Dashboard** | Animated counters, heatmap, area chart, donut chart, word cloud |
| **Hall of Shame** | 8 trading-card style awards (Ghost, Novelist, Spammer, etc.) |
| **Member Deep Dive** | Per-user radar chart, hourly bar chart, monthly line chart |
| **Drag & Drop Upload** | Animated file drop zone with progress bar |
| **Responsive Design** | Bento-box grid on desktop, single column on mobile |
| **Cream/Periwinkle/Mint** | "Digital Soft Pop" design system |

---

## 🏗️ Project Structure

```
chat-vibe/
├── backend/
│   ├── main.py          # FastAPI server — upload endpoint
│   ├── parser.py        # WhatsApp .txt → pandas DataFrame
│   ├── analyzer.py      # All stats calculations
│   └── requirements.txt
│
├── frontend/
│   ├── index.html
│   ├── vite.config.js   # Dev proxy: /api → localhost:8000
│   ├── tailwind.config.js
│   ├── src/
│   │   ├── App.jsx              # Root: state, navbar, routing
│   │   ├── index.css            # Global styles + Tailwind
│   │   └── components/
│   │       ├── LandingScreen.jsx  # Pre-upload hero
│   │       ├── UploadModal.jsx    # Drag-and-drop modal
│   │       ├── Dashboard.jsx      # Main analytics grid
│   │       ├── HallOfShame.jsx    # 8 award cards
│   │       └── MemberAnalysis.jsx # Individual user view
│   └── package.json
│
└── README.md
```

---

## 🛠️ Tech Stack

### Backend
| Library | Purpose |
|---|---|
| **FastAPI** | HTTP API framework (async, fast, auto-docs) |
| **pandas** | Data manipulation — groupby, aggregations, etc. |
| **emoji** | Emoji extraction and counting from message text |
| **uvicorn** | ASGI server to run FastAPI |
| **python-multipart** | Required for `UploadFile` in FastAPI |

### Frontend
| Library | Purpose |
|---|---|
| **React 18** | Component-based UI |
| **Vite** | Lightning-fast dev server + bundler |
| **Tailwind CSS** | Utility-first CSS (cream/periwinkle theme) |
| **Framer Motion** | Page transitions, card hovers, count animations |
| **Recharts** | Responsive charts (Bar, Area, Radar, Pie, Line) |
| **Lucide React** | Icon set |
| **Axios** | HTTP client for API calls |

---

## 📋 Prerequisites

Make sure you have these installed before starting:

- **Python 3.10+** — `python --version`
- **Node.js 18+** — `node --version`
- **npm 9+** — `npm --version`

---

## 🚀 Local Setup Guide (Virtual Environment)

### Step 1 — Clone / download the project

```bash
# If you have git:
git clone <your-repo-url> chat-vibe
cd chat-vibe

# Or just unzip the downloaded folder and cd into it
cd chat-vibe
```

---

### Step 2 — Set up the Python Backend

#### 2a. Create a virtual environment

```bash
# Navigate to the backend folder
cd backend

# Create a virtual environment named "venv"
python -m venv venv
```

This creates a folder `backend/venv/` that contains an isolated Python environment.
**Nothing is installed globally** — everything stays inside `venv/`.

#### 2b. Activate the virtual environment

```bash
# On macOS / Linux:
source venv/bin/activate

# On Windows (Command Prompt):
venv\Scripts\activate.bat

# On Windows (PowerShell):
venv\Scripts\Activate.ps1
```

You'll know it's active when you see `(venv)` at the start of your terminal prompt.

#### 2c. Install Python dependencies

```bash
pip install -r requirements.txt
```

This installs: `fastapi`, `uvicorn`, `pandas`, `emoji`, `python-multipart`.

#### 2d. Start the FastAPI server

```bash
uvicorn main:app --reload --port 8000
```

| Flag | Meaning |
|---|---|
| `main:app` | Run the `app` object from `main.py` |
| `--reload` | Auto-restart when you edit Python files |
| `--port 8000` | Listen on port 8000 |

✅ You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
```

You can verify the API is alive by visiting: **http://localhost:8000/api/health**

**Leave this terminal running** and open a new terminal for the frontend.

---

### Step 3 — Set up the React Frontend

#### 3a. Open a NEW terminal and navigate to the frontend folder

```bash
# From the project root:
cd frontend
```

#### 3b. Install Node.js dependencies

```bash
npm install
```

This reads `package.json` and installs React, Vite, Tailwind, Framer Motion, Recharts, etc. into `node_modules/`.

#### 3c. Start the development server

```bash
npm run dev
```

✅ You should see:
```
  VITE v5.x.x  ready in 300ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.x.x:5173/
```

#### 3d. Open the app

Go to **http://localhost:5173** in your browser.

> **How the proxy works:** Vite is configured (in `vite.config.js`) to forward any request starting with `/api` to `http://localhost:8000`. This means when the frontend calls `/api/upload`, it actually hits your FastAPI server — no CORS issues during development.

---

## 📱 How to Export Your WhatsApp Chat

### On Android:
1. Open the group chat in WhatsApp
2. Tap the group name at the top
3. Scroll down → tap **"Export Chat"**
4. Select **"Without Media"**
5. Save the `.txt` file to your device and transfer to your computer

### On iPhone (iOS):
1. Open the group chat
2. Tap the group name at the top
3. Scroll down → tap **"Export Chat"**
4. Select **"Without Media"**
5. Use AirDrop, email, or iCloud Drive to get the `.txt` file to your computer

> **Note:** The parser handles both Android and iOS export formats, including 12-hour and 24-hour timestamp styles.

---

## 🔧 Troubleshooting

### "Could not parse the chat file"
The parser couldn't recognize your file's timestamp format.

**Fix:** Open your `.txt` file in a text editor and check the first few lines. Common formats:
- `[12/25/2023, 3:45:00 PM] Alice: Hello` → bracketed iOS
- `25/12/2023, 15:45 - Alice: Hello` → Android dash format

If your format is different (e.g., `MM/DD/YY` vs `DD/MM/YY`), the parser's `_parse_timestamp` function in `parser.py` tries many combinations automatically. If it still fails, check the date order in your file and adjust `date_formats` in `parser.py`.

### "Emoji library import error"
```bash
pip install emoji --upgrade
```

### Frontend won't connect to backend (CORS or 502 error)
- Make sure FastAPI is running on port 8000: `curl http://localhost:8000/api/health`
- Make sure you started frontend with `npm run dev` (not `npm run build`)
- The Vite proxy only works in development mode

### "venv\Scripts\Activate.ps1 cannot be loaded" (Windows PowerShell)
Run this once to allow script execution:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Port already in use
```bash
# For backend (kills whatever is on port 8000):
lsof -ti:8000 | xargs kill -9   # macOS/Linux
netstat -ano | findstr :8000     # Windows — then: taskkill /PID <PID> /F

# Change the backend port:
uvicorn main:app --reload --port 8001
# Then update vite.config.js proxy target to http://localhost:8001
```

---

## 🌐 API Reference

FastAPI automatically generates interactive docs at: **http://localhost:8000/docs**

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Liveness check |
| `POST` | `/api/upload` | Upload + analyze a `.txt` file |
| `GET` | `/api/member?name=Alice` | Member deep-dive (requires prior upload) |

### POST /api/upload Response Shape

```json
{
  "success": true,
  "filename": "WhatsApp Chat.txt",
  "global_stats": { "total_messages": 12500, ... },
  "heatmap": [{ "day": "Mon", "hour": 14, "count": 42 }, ...],
  "day_of_week": [{ "day": "Mon", "messages": 1200 }, ...],
  "monthly_timeline": [{ "month": "Jan 2024", "messages": 800 }, ...],
  "message_breakdown": [{ "name": "Text", "value": 11000 }, ...],
  "top_emojis": [{ "emoji": "😂", "count": 450 }, ...],
  "leaderboard": [{ "name": "Alice", "messages": 3500, "percentage": 28.0, "rank": 1 }, ...],
  "word_cloud": [{ "text": "bro", "value": 85 }, ...],
  "hall_of_shame": { "ghost": { "winner": "Bob", ... }, ... },
  "members": ["Alice", "Bob", "Charlie"]
}
```

---

## 🛑 Stopping the Servers

```bash
# In each terminal:
CTRL + C
```

To deactivate the Python virtual environment:
```bash
deactivate
```

---

## 🔒 Privacy

- Your chat data is processed **entirely on your own machine**
- Nothing is sent to any external server
- The backend holds parsed data **in memory only** (cleared when the server restarts)
- No database, no logging of message content

---

## 📄 License

MIT — do whatever you want with it.
