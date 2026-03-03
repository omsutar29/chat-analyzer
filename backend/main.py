"""
main.py — Chat Vibe FastAPI Backend (No pandas)
================================================
Session-aware. Each user gets a unique session ID via the
x-session-id header. Data is stored as plain Python lists.
Sessions expire after 1 hour via a background cleanup thread.
"""

import time
import threading
from fastapi import FastAPI, File, UploadFile, HTTPException, Header, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Optional

from parser import parse_chat
from analyzer import (
    get_global_stats, get_hourly_heatmap, get_day_of_week_stats,
    get_monthly_timeline, get_message_breakdown, get_top_emojis,
    get_leaderboard, get_word_cloud, get_hall_of_shame,
    get_member_stats, get_all_members,
)

# ─────────────────────────────────────────────
#  App
# ─────────────────────────────────────────────

app = FastAPI(title="Chat Vibe API", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
#  Session Store  { session_id: { "rows": [...], "last_used": float } }
# ─────────────────────────────────────────────

SESSION_STORE: dict = {}
SESSION_TTL   = 3600  # 1 hour


def _get_rows(session_id: str) -> list[dict]:
    if session_id not in SESSION_STORE:
        raise HTTPException(
            status_code=400,
            detail="No chat data found for your session. Please upload a file first."
        )
    SESSION_STORE[session_id]["last_used"] = time.time()
    return SESSION_STORE[session_id]["rows"]


def _cleanup():
    while True:
        time.sleep(600)
        now     = time.time()
        expired = [sid for sid, d in SESSION_STORE.items()
                   if now - d["last_used"] > SESSION_TTL]
        for sid in expired:
            del SESSION_STORE[sid]
        if expired:
            print(f"[cleanup] Removed {len(expired)} session(s). Active: {len(SESSION_STORE)}")


threading.Thread(target=_cleanup, daemon=True).start()


# ─────────────────────────────────────────────
#  Endpoints
# ─────────────────────────────────────────────

@app.get("/api/health")
async def health():
    return {"status": "ok", "message": "Chat Vibe API is running 🚀",
            "active_sessions": len(SESSION_STORE)}


@app.post("/api/upload")
async def upload_chat(
    file: UploadFile = File(...),
    x_session_id: Optional[str] = Header(None),
):
    if not x_session_id:
        raise HTTPException(status_code=400, detail="Missing x-session-id header.")
    if not file.filename.endswith(".txt"):
        raise HTTPException(status_code=400, detail="Please upload a WhatsApp .txt export file.")

    raw = await file.read()
    try:
        content = raw.decode("utf-8")
    except UnicodeDecodeError:
        content = raw.decode("latin-1")

    try:
        rows = parse_chat(content)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    SESSION_STORE[x_session_id] = {"rows": rows, "last_used": time.time()}
    print(f"[upload] Session {x_session_id[:8]}... rows={len(rows)} active={len(SESSION_STORE)}")

    try:
        data = {
            "success":          True,
            "filename":         file.filename,
            "global_stats":     get_global_stats(rows),
            "heatmap":          get_hourly_heatmap(rows),
            "day_of_week":      get_day_of_week_stats(rows),
            "monthly_timeline": get_monthly_timeline(rows),
            "message_breakdown":get_message_breakdown(rows),
            "top_emojis":       get_top_emojis(rows),
            "leaderboard":      get_leaderboard(rows),
            "word_cloud":       get_word_cloud(rows),
            "hall_of_shame":    get_hall_of_shame(rows),
            "members":          get_all_members(rows),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

    return JSONResponse(content=data)


@app.get("/api/member")
async def member_dive(
    name: str = Query(...),
    x_session_id: Optional[str] = Header(None),
):
    if not x_session_id:
        raise HTTPException(status_code=400, detail="Missing x-session-id header.")
    rows = _get_rows(x_session_id)
    try:
        return JSONResponse(content=get_member_stats(rows, name))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
