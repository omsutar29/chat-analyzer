"""
parser.py — WhatsApp Chat Log Parser
=====================================
Handles both Android and iOS export formats, 12h and 24h timestamps,
multi-line messages, and system messages.

WhatsApp export formats handled:
  Android 24h:  [DD/MM/YYYY, HH:MM:SS] Name: Message
  Android 12h:  [DD/MM/YYYY, HH:MM AM/PM] Name: Message
  iOS 24h:      [DD/MM/YYYY, HH:MM:SS] Name: Message
  iOS 12h:      DD/MM/YYYY, HH:MM am/pm - Name: Message
  Android alt:  MM/DD/YY, HH:MM AM/PM - Name: Message
"""

import re
import pandas as pd
from datetime import datetime
from collections import Counter
import emoji


# ─────────────────────────────────────────────
#  Regex Patterns — ordered most-to-least specific
# ─────────────────────────────────────────────

# Pattern group 1: Bracketed timestamps  → [DD/MM/YYYY, HH:MM:SS]
PATTERN_BRACKETED = re.compile(
    r"^\[(\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{2,4}),\s*(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[aApP][mM])?)\]\s+"
    r"([^:]+?):\s+(.*)",
    re.MULTILINE
)

# Pattern group 2: Dash separator → DD/MM/YYYY, HH:MM AM/PM - Name: Message
PATTERN_DASH = re.compile(
    r"^(\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{2,4}),\s*(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[aApP][mM])?)\s+-\s+"
    r"([^:]+?):\s+(.*)",
    re.MULTILINE
)

# System message keywords to exclude from analysis
SYSTEM_KEYWORDS = [
    "messages and calls are end-to-end encrypted",
    "changed the group name",
    "added", "removed", "left", "joined",
    "changed this group's icon",
    "changed the subject",
    "was added", "were added",
    "<media omitted>",  # keep this as message type but mark it
    "this message was deleted",
    "you created group",
    "changed their phone number",
    "security code changed",
    "pinned a message",
]


def _is_system_message(text: str) -> bool:
    """Return True if the message is a WhatsApp system notification."""
    lower = text.strip().lower()
    return any(kw in lower for kw in SYSTEM_KEYWORDS[:10])  # exclude <media omitted>


def _parse_timestamp(date_str: str, time_str: str) -> datetime | None:
    """
    Try multiple date/time format combinations.
    Returns a datetime object or None if parsing fails.
    """
    # Normalize separators
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


def parse_chat(file_content: str) -> pd.DataFrame:
    """
    Main parsing function.

    Parameters
    ----------
    file_content : str
        Raw text content of the WhatsApp .txt export.

    Returns
    -------
    pd.DataFrame with columns:
        timestamp, sender, message, is_media, is_system,
        emoji_count, word_count, char_count, has_url
    """
    rows = []

    # Try bracketed pattern first, then dash pattern
    matches = list(PATTERN_BRACKETED.finditer(file_content))
    if not matches:
        matches = list(PATTERN_DASH.finditer(file_content))

    if not matches:
        raise ValueError(
            "Could not parse the chat file. "
            "Please ensure it's an unmodified WhatsApp export (.txt)."
        )

    # Build list of (start, end) positions to capture multi-line messages
    for i, match in enumerate(matches):
        date_str, time_str, sender, message_first_line = match.groups()

        # Multi-line: grab text until the next match starts
        if i + 1 < len(matches):
            next_start = matches[i + 1].start()
            full_msg_raw = file_content[match.start():next_start]
        else:
            full_msg_raw = file_content[match.start():]

        # Strip the header line, keep continuation lines
        continuation = "\n".join(full_msg_raw.split("\n")[1:]).strip()
        message = f"{message_first_line}\n{continuation}".strip() if continuation else message_first_line.strip()

        ts = _parse_timestamp(date_str, time_str)
        if ts is None:
            continue

        is_system = _is_system_message(message)
        is_media = "<media omitted>" in message.lower() or "<attached:" in message.lower()

        # Emoji extraction using the `emoji` library
        emojis_found = emoji.emoji_list(message)
        emoji_count = len(emojis_found)
        emoji_chars = [e["emoji"] for e in emojis_found]

        # URL detection
        has_url = bool(re.search(r"https?://\S+", message))

        # Word count (strip emojis and URLs for cleaner count)
        clean_msg = re.sub(r"https?://\S+", "", message)
        clean_msg = emoji.replace_emoji(clean_msg, replace="")
        words = [w for w in clean_msg.split() if w.strip()]

        rows.append({
            "timestamp": ts,
            "sender": sender.strip(),
            "message": message,
            "is_media": is_media,
            "is_system": is_system,
            "emoji_count": emoji_count,
            "emojis": emoji_chars,
            "word_count": len(words),
            "char_count": len(message),
            "has_url": has_url,
            "hour": ts.hour,
            "day_of_week": ts.strftime("%A"),  # e.g., "Monday"
            "month_year": ts.strftime("%b %Y"),  # e.g., "Jan 2024"
            "date": ts.date(),
        })

    df = pd.DataFrame(rows)

    if df.empty:
        raise ValueError("Parsed 0 messages. Please check your chat file format.")

    # Keep only real user messages for most analysis (system excluded)
    return df
