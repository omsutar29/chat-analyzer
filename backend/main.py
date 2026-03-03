"""
main.py — Chat Vibe FastAPI Backend
=====================================
Session-aware version: each user gets a unique session ID so multiple
users can analyze different chats simultaneously without colliding.

How it works:
  1. Frontend generates a random session_id (UUID) on first load and
     stores it in React state. It never changes during the session.
  2. Every API request includes this session_id as a header: x-session-id
  3. The backend stores each user's DataFrame in a dict keyed by session_id.
  4. Sessions are automatically cleaned up after 1 hour of inactivity.
"""

import time
import threading
from fastapi import FastAPI, File, UploadFile, HTTPException, Header, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Optional

from parser import parse_chat
from analyzer import (
    get_global_stats,
    get_hourly_heatmap,
    get_day_of_week_stats,
    get_monthly_timeline,
    get_message_breakdown,
    get_top_emojis,
    get_leaderboard,
    get_word_cloud,
    get_hall_of_shame,
    get_member_stats,
    get_all_members,
)

# ─────────────────────────────────────────────
#  App Setup
# ─────────────────────────────────────────────

app = FastAPI(
    title="Chat Vibe API",
    description="WhatsApp Chat Analyzer — session-isolated per user.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
#  Session Store
# ─────────────────────────────────────────────
# { session_id: { "df": DataFrame, "last_used": float } }
SESSION_STORE: dict = {}
SESSION_TTL_SECONDS = 3600  # 1 hour


def _get_session_df(session_id: str):
    if session_id not in SESSION_STORE:
        raise HTTPException(
            status_code=400,
            detail="No chat data found for your session. Please upload a file first."
        )
    SESSION_STORE[session_id]["last_used"] = time.time()
    return SESSION_STORE[session_id]["df"]


def _cleanup_expired_sessions():
    """Background thread — removes sessions idle for over 1 hour."""
    while True:
        time.sleep(600)
        now = time.time()
        expired = [
            sid for sid, data in SESSION_STORE.items()
            if now - data["last_used"] > SESSION_TTL_SECONDS
        ]
        for sid in expired:
            del SESSION_STORE[sid]
        if expired:
            print(f"[cleanup] Removed {len(expired)} expired session(s). Active: {len(SESSION_STORE)}")


cleanup_thread = threading.Thread(target=_cleanup_expired_sessions, daemon=True)
cleanup_thread.start()


# ─────────────────────────────────────────────
#  Endpoints
# ─────────────────────────────────────────────

@app.get("/api/health")
async def health_check():
    return {
        "status": "ok",
        "message": "Chat Vibe API is running 🚀",
        "active_sessions": len(SESSION_STORE),
    }


@app.post("/api/upload")
async def upload_chat(
    file: UploadFile = File(...),
    x_session_id: Optional[str] = Header(None),
):
    if not x_session_id:
        raise HTTPException(status_code=400, detail="Missing x-session-id header.")
    if not file.filename.endswith(".txt"):
        raise HTTPException(status_code=400, detail="Please upload a WhatsApp .txt export file.")

    raw_bytes = await file.read()
    try:
        content = raw_bytes.decode("utf-8")
    except UnicodeDecodeError:
        content = raw_bytes.decode("latin-1")

    try:
        df = parse_chat(content)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    # Store under THIS user's session — fully isolated from other users
    SESSION_STORE[x_session_id] = {"df": df, "last_used": time.time()}
    print(f"[upload] Session {x_session_id[:8]}... Active sessions: {len(SESSION_STORE)}")

    try:
        response_data = {
            "success": True,
            "filename": file.filename,
            "global_stats": get_global_stats(df),
            "heatmap": get_hourly_heatmap(df),
            "day_of_week": get_day_of_week_stats(df),
            "monthly_timeline": get_monthly_timeline(df),
            "message_breakdown": get_message_breakdown(df),
            "top_emojis": get_top_emojis(df),
            "leaderboard": get_leaderboard(df),
            "word_cloud": get_word_cloud(df),
            "hall_of_shame": get_hall_of_shame(df),
            "members": get_all_members(df),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

    return JSONResponse(content=response_data)


@app.get("/api/member")
async def get_member_deep_dive(
    name: str = Query(...),
    x_session_id: Optional[str] = Header(None),
):
    if not x_session_id:
        raise HTTPException(status_code=400, detail="Missing x-session-id header.")
    df = _get_session_df(x_session_id)
    try:
        data = get_member_stats(df, name)
        return JSONResponse(content=data)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
