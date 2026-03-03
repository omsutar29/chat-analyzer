"""
parser.py — WhatsApp Chat Log Parser (No pandas, pure Python)
==============================================================
Handles both Android and iOS export formats, 12h/24h timestamps,
multi-line messages, and system messages.

Returns a list of dicts instead of a DataFrame — zero C extensions,
works on any Python version Render ever installs.
"""

import re
from datetime import datetime
import emoji


# ─────────────────────────────────────────────
#  Regex Patterns
# ─────────────────────────────────────────────

# Pattern 1: Bracketed  → [DD/MM/YYYY, HH:MM:SS] Name: Message
PATTERN_BRACKETED = re.compile(
    r"^\[(\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{2,4}),\s*"
    r"(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[aApP][mM])?)\]\s+"
    r"([^:]+?):\s+(.*)",
    re.MULTILINE
)

# Pattern 2: Dash separator → DD/MM/YYYY, HH:MM - Name: Message
PATTERN_DASH = re.compile(
    r"^(\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{2,4}),\s*"
    r"(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[aApP][mM])?)\s+-\s+"
    r"([^:]+?):\s+(.*)",
    re.MULTILINE
)

SYSTEM_KEYWORDS = [
    "messages and calls are end-to-end encrypted",
    "changed the group name", "added", "removed", "left", "joined",
    "changed this group's icon", "changed the subject",
    "was added", "were added", "this message was deleted",
    "you created group", "changed their phone number",
    "security code changed", "pinned a message",
]

DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


def _is_system_message(text: str) -> bool:
    lower = text.strip().lower()
    return any(kw in lower for kw in SYSTEM_KEYWORDS)


def _parse_timestamp(date_str: str, time_str: str):
    date_str = re.sub(r"[.\-]", "/", date_str.strip())
    time_str = time_str.strip()
    date_formats = ["%d/%m/%Y", "%d/%m/%y", "%m/%d/%y", "%m/%d/%Y", "%Y/%m/%d"]
    time_formats = ["%H:%M:%S", "%H:%M", "%I:%M:%S %p", "%I:%M %p",
                    "%I:%M:%S%p", "%I:%M%p"]
    for dfmt in date_formats:
        for tfmt in time_formats:
            try:
                return datetime.strptime(f"{date_str} {time_str}", f"{dfmt} {tfmt}")
            except ValueError:
                continue
    return None


def parse_chat(file_content: str) -> list[dict]:
    """
    Parse WhatsApp export into a list of message dicts.

    Each dict has:
      timestamp, sender, message, is_media, is_system,
      emoji_count, emojis, word_count, char_count, has_url,
      hour, day_of_week, day_short, month_year, date_str
    """
    rows = []

    matches = list(PATTERN_BRACKETED.finditer(file_content))
    if not matches:
        matches = list(PATTERN_DASH.finditer(file_content))
    if not matches:
        raise ValueError(
            "Could not parse the chat file. "
            "Please ensure it's an unmodified WhatsApp export (.txt)."
        )

    for i, match in enumerate(matches):
        date_str, time_str, sender, message_first_line = match.groups()

        # Capture multi-line continuations
        if i + 1 < len(matches):
            next_start = matches[i + 1].start()
            full_msg_raw = file_content[match.start():next_start]
        else:
            full_msg_raw = file_content[match.start():]

        continuation = "\n".join(full_msg_raw.split("\n")[1:]).strip()
        message = f"{message_first_line}\n{continuation}".strip() if continuation else message_first_line.strip()

        ts = _parse_timestamp(date_str, time_str)
        if ts is None:
            continue

        is_system = _is_system_message(message)
        is_media  = "<media omitted>" in message.lower() or "<attached:" in message.lower()

        emojis_found = emoji.emoji_list(message)
        emoji_chars  = [e["emoji"] for e in emojis_found]

        has_url = bool(re.search(r"https?://\S+", message))

        clean_msg = re.sub(r"https?://\S+", "", message)
        clean_msg = emoji.replace_emoji(clean_msg, replace="")
        words = [w for w in clean_msg.split() if w.strip()]

        dow = ts.weekday()  # 0=Mon … 6=Sun

        rows.append({
            "timestamp":   ts,
            "sender":      sender.strip(),
            "message":     message,
            "is_media":    is_media,
            "is_system":   is_system,
            "emoji_count": len(emoji_chars),
            "emojis":      emoji_chars,
            "word_count":  len(words),
            "char_count":  len(message),
            "has_url":     has_url,
            "hour":        ts.hour,
            "dow":         dow,
            "day_of_week": DAY_NAMES[dow],
            "day_short":   DAY_SHORT[dow],
            "month_year":  ts.strftime("%b %Y"),
            "date_str":    str(ts.date()),
        })

    if not rows:
        raise ValueError("Parsed 0 messages. Please check your chat file format.")

    return rows
