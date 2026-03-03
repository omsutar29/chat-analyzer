"""
analyzer.py — Chat Statistics & Insights Generator
====================================================
All analytical functions that transform the parsed DataFrame into
structured JSON data for the frontend.

Functions are grouped by feature section:
  - Global stats (dashboard vitals)
  - Temporal analysis (heatmap, day-of-week, monthly)
  - Content stats (emojis, word cloud, leaderboard)
  - Hall of Shame (8 special awards)
  - Member deep-dive (individual user stats)
"""

import re
from collections import Counter
from typing import Any

import pandas as pd


# ─────────────────────────────────────────────
#  Stopwords for Word Cloud
# ─────────────────────────────────────────────

STOPWORDS = {
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "up", "about", "into", "through", "is",
    "are", "was", "were", "be", "been", "being", "have", "has", "had",
    "do", "does", "did", "will", "would", "could", "should", "may",
    "might", "shall", "can", "not", "no", "nor", "so", "yet", "both",
    "either", "neither", "such", "that", "this", "these", "those", "i",
    "me", "my", "we", "our", "you", "your", "he", "she", "it", "they",
    "them", "his", "her", "its", "their", "who", "which", "what", "all",
    "just", "like", "ok", "okay", "yes", "yeah", "yep", "no", "nope",
    "lol", "haha", "hahaha", "oh", "ah", "hmm", "um", "hi", "hey",
    "hello", "thanks", "thank", "please", "also", "really", "very",
    "more", "much", "many", "some", "any", "how", "when", "where",
    "why", "there", "here", "if", "then", "than", "too", "only", "still",
    "even", "get", "got", "go", "come", "know", "think", "want", "see",
    "one", "two", "time", "day", "good", "well", "said", "will", "message",
    "media", "omitted", "deleted", "null", "none", "am", "pm", "ka", "ki", 
    "ke", "ko", "se", "ne", "ye", "wo", "jo", "kya", "aur", "hai", "ho", 
    "na", "ni", "bhi", "toh", "to", "ab", "sb", "ek", "ds", "dse", "aahe", 
    "ahe", "cha", "changed", "tap", "curr", "edited", "informed", "dear", 
    "batch",
}


# ─────────────────────────────────────────────
#  Helpers
# ─────────────────────────────────────────────

def _user_df(df: pd.DataFrame) -> pd.DataFrame:
    """Return only non-system, non-empty rows."""
    return df[~df["is_system"] & (df["message"].str.strip() != "")]


# ─────────────────────────────────────────────
#  1. Global / Dashboard Vitals
# ─────────────────────────────────────────────

def get_global_stats(df: pd.DataFrame) -> dict[str, Any]:
    """
    Compute top-level summary metrics shown in the 'Vitals' row.

    Returns
    -------
    dict with: total_messages, total_participants, media_count,
               links_shared, first_date, last_date, most_active_user
    """
    udf = _user_df(df)

    return {
        "total_messages": int(len(udf)),
        "total_participants": int(udf["sender"].nunique()),
        "media_count": int(udf["is_media"].sum()),
        "links_shared": int(udf["has_url"].sum()),
        "first_date": str(df["timestamp"].min().date()),
        "last_date": str(df["timestamp"].max().date()),
        "most_active_user": str(udf["sender"].value_counts().idxmax()),
        "total_emojis": int(udf["emoji_count"].sum()),
        "total_words": int(udf["word_count"].sum()),
    }


# ─────────────────────────────────────────────
#  2. Temporal Analysis
# ─────────────────────────────────────────────

def get_hourly_heatmap(df: pd.DataFrame) -> list[dict]:
    """
    GitHub-style activity heatmap: Day-of-week × Hour.

    Returns list of {day, hour, count} for all 7×24 = 168 cells.
    """
    udf = _user_df(df)
    udf = udf.copy()
    udf["dow_num"] = udf["timestamp"].dt.dayofweek  # 0=Mon … 6=Sun
    udf["day_name"] = udf["timestamp"].dt.strftime("%a")  # "Mon", "Tue"…

    grouped = (
        udf.groupby(["dow_num", "day_name", "hour"])
        .size()
        .reset_index(name="count")
    )

    result = []
    days_order = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    for _, row in grouped.iterrows():
        result.append({
            "day": row["day_name"],
            "hour": int(row["hour"]),
            "count": int(row["count"]),
        })
    return result


def get_day_of_week_stats(df: pd.DataFrame) -> list[dict]:
    """Message count grouped by day of week, ordered Mon→Sun."""
    udf = _user_df(df)
    order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    counts = udf["day_of_week"].value_counts().reindex(order, fill_value=0)
    return [{"day": d[:3], "messages": int(counts[d])} for d in order]


def get_monthly_timeline(df: pd.DataFrame) -> list[dict]:
    """
    Message count per calendar month for the Area Chart.
    Returns sorted list of {month, messages}.
    """
    udf = _user_df(df)
    udf = udf.copy()
    udf["ym"] = udf["timestamp"].dt.to_period("M")
    counts = udf.groupby("ym").size().reset_index(name="messages")
    counts["month"] = counts["ym"].dt.strftime("%b %Y")
    counts = counts.sort_values("ym")
    return counts[["month", "messages"]].to_dict(orient="records")


# ─────────────────────────────────────────────
#  3. Content & Fun Stats
# ─────────────────────────────────────────────

def get_message_breakdown(df: pd.DataFrame) -> list[dict]:
    """Donut chart data: Text vs Media vs Emoji-only messages."""
    udf = _user_df(df)
    media = int(udf["is_media"].sum())
    emoji_only = int(((udf["emoji_count"] > 0) & (~udf["is_media"]) &
                       (udf["word_count"] == 0)).sum())
    text = int(len(udf)) - media - emoji_only
    return [
        {"name": "Text", "value": max(text, 0)},
        {"name": "Media", "value": media},
        {"name": "Emoji Only", "value": emoji_only},
    ]


def get_top_emojis(df: pd.DataFrame, n: int = 6) -> list[dict]:
    """
    Top N emojis used across the whole chat.
    Returns [{emoji, count}] sorted by count descending.
    """
    udf = _user_df(df)
    all_emojis = [e for sublist in udf["emojis"] for e in sublist]
    counter = Counter(all_emojis)
    return [{"emoji": e, "count": c} for e, c in counter.most_common(n)]


def get_leaderboard(df: pd.DataFrame, n: int = 10) -> list[dict]:
    """Top N users by message count with rank, percentage."""
    udf = _user_df(df)
    total = len(udf)
    counts = udf["sender"].value_counts().head(n).reset_index()
    counts.columns = ["name", "messages"]
    counts["percentage"] = (counts["messages"] / total * 100).round(1)
    counts["rank"] = range(1, len(counts) + 1)
    return counts.to_dict(orient="records")


def get_word_cloud(df: pd.DataFrame, n: int = 60) -> list[dict]:
    """
    Top N words excluding stopwords for the word cloud.
    Returns [{text, value}] where value drives font size.
    """
    udf = _user_df(df)
    # Combine all messages; strip URLs and emojis
    import emoji as emoji_lib
    text = " ".join(udf["message"].tolist())
    text = re.sub(r"https?://\S+", "", text)
    text = emoji_lib.replace_emoji(text, replace=" ")
    words = re.findall(r"\b[a-zA-Z]{2,}\b", text.lower())
    filtered = [w for w in words if w not in STOPWORDS]
    counter = Counter(filtered).most_common(n)
    if not counter:
        return []
    max_count = counter[0][1]
    return [{"text": w, "value": round(c / max_count * 100)} for w, c in counter]


# ─────────────────────────────────────────────
#  4. Hall of Shame (8 Award Categories)
# ─────────────────────────────────────────────

def get_hall_of_shame(df: pd.DataFrame) -> dict[str, Any]:
    """
    Compute all 8 Hall of Shame awards.

    Returns dict keyed by award slug, each value:
      {winner, stat_label, stat_value, funny_subtitle}
    """
    udf = _user_df(df)
    awards = {}

    # ── 1. The Ghost (least active who's still in the group) ──────────────
    counts = udf["sender"].value_counts()
    if len(counts) > 0:
        ghost = counts.idxmin()
        awards["ghost"] = {
            "winner": ghost,
            "stat_label": "Total Messages",
            "stat_value": int(counts[ghost]),
            "funny_subtitle": "Joined the group, chose violence by staying silent.",
        }

    # ── 2. The Novelist (highest avg char count) ─────────────────────────
    avg_chars = udf.groupby("sender")["char_count"].mean()
    if len(avg_chars) > 0:
        novelist = avg_chars.idxmax()
        awards["novelist"] = {
            "winner": novelist,
            "stat_label": "Avg. Characters/Msg",
            "stat_value": round(float(avg_chars[novelist]), 1),
            "funny_subtitle": "Every reply is a TED talk nobody asked for.",
        }

    # ── 3. The Spammer (most consecutive messages) ───────────────────────
    df_sorted = udf.sort_values("timestamp")
    max_streak = 0
    spammer = ""
    current_streak = 1
    current_person = ""

    for _, row in df_sorted.iterrows():
        if row["sender"] == current_person:
            current_streak += 1
            if current_streak > max_streak:
                max_streak = current_streak
                spammer = current_person
        else:
            current_streak = 1
            current_person = row["sender"]

    if spammer:
        awards["spammer"] = {
            "winner": spammer,
            "stat_label": "Consecutive Messages",
            "stat_value": max_streak,
            "funny_subtitle": "Discovered 'Reply' is not a suggestion.",
        }

    # ── 4. Emoji Overload (highest emoji count) ──────────────────────────
    emoji_totals = udf.groupby("sender")["emoji_count"].sum()
    if len(emoji_totals) > 0:
        emoji_king = emoji_totals.idxmax()
        awards["emoji_overload"] = {
            "winner": emoji_king,
            "stat_label": "Total Emojis Used",
            "stat_value": int(emoji_totals[emoji_king]),
            "funny_subtitle": "Words? Never heard of them. 🔥💀🤣🔥",
        }

    # ── 5. Night Owl (1 AM – 5 AM) ───────────────────────────────────────
    night = udf[udf["hour"].between(1, 4)]
    if len(night) > 0:
        owl = night["sender"].value_counts().idxmax()
        awards["night_owl"] = {
            "winner": owl,
            "stat_label": "Late Night Messages",
            "stat_value": int(night["sender"].value_counts()[owl]),
            "funny_subtitle": "Sleep is a concept. The group chat is life.",
        }

    # ── 6. Question Machine (most question marks) ────────────────────────
    udf_q = udf.copy()
    udf_q["q_marks"] = udf_q["message"].str.count(r"\?")
    q_totals = udf_q.groupby("sender")["q_marks"].sum()
    if len(q_totals) > 0:
        questioner = q_totals.idxmax()
        awards["question_machine"] = {
            "winner": questioner,
            "stat_label": "Question Marks Used",
            "stat_value": int(q_totals[questioner]),
            "funny_subtitle": "Has questions. So many questions. Always questions.",
        }

    # ── 7. Media Lord (most media messages) ──────────────────────────────
    media_df = udf[udf["is_media"]]
    if len(media_df) > 0:
        media_lord = media_df["sender"].value_counts().idxmax()
        awards["media_lord"] = {
            "winner": media_lord,
            "stat_label": "Media Files Sent",
            "stat_value": int(media_df["sender"].value_counts()[media_lord]),
            "funny_subtitle": "Singlehandedly filling everyone's storage.",
        }

    # ── 8. Early Bird (5 AM – 8 AM) ──────────────────────────────────────
    early = udf[udf["hour"].between(5, 7)]
    if len(early) > 0:
        bird = early["sender"].value_counts().idxmax()
        awards["early_bird"] = {
            "winner": bird,
            "stat_label": "Early Morning Messages",
            "stat_value": int(early["sender"].value_counts()[bird]),
            "funny_subtitle": "Up before the sun. Texting before coffee.",
        }

    return awards


# ─────────────────────────────────────────────
#  5. Member Deep Dive
# ─────────────────────────────────────────────

def get_member_stats(df: pd.DataFrame, member: str) -> dict[str, Any]:
    """
    Full stats profile for a single member.

    Parameters
    ----------
    df     : Full parsed DataFrame
    member : Exact sender name string

    Returns
    -------
    dict with profile, radar_data, hourly_activity, monthly_activity
    """
    udf = _user_df(df)
    mdf = udf[udf["sender"] == member]

    if mdf.empty:
        raise ValueError(f"Member '{member}' not found in chat data.")

    total = len(udf)
    member_total = len(mdf)
    group_avg_msgs = total / max(udf["sender"].nunique(), 1)

    # Rank (1 = most active)
    rank = int(udf["sender"].value_counts().rank(ascending=False)[member])

    # ── Profile Card ──────────────────────────────────────────────────────
    profile = {
        "name": member,
        "total_messages": member_total,
        "rank": rank,
        "percentage_of_chat": round(member_total / total * 100, 1),
        "total_words": int(mdf["word_count"].sum()),
        "total_emojis": int(mdf["emoji_count"].sum()),
        "total_media": int(mdf["is_media"].sum()),
        "total_links": int(mdf["has_url"].sum()),
        "avg_msg_length": round(float(mdf["char_count"].mean()), 1),
    }

    # ── Radar Chart: Member vs Group Avg (normalized 0-100) ──────────────
    def normalize(member_val, group_vals):
        """Scale member value relative to group max → 0–100."""
        max_val = group_vals.max()
        return round(member_val / max(max_val, 1) * 100, 1)

    per_user = udf.groupby("sender").agg(
        msgs=("message", "count"),
        words=("word_count", "sum"),
        media=("is_media", "sum"),
        emojis=("emoji_count", "sum"),
        links=("has_url", "sum"),
    )

    radar_data = [
        {
            "metric": "Messages",
            "user": normalize(member_total, per_user["msgs"]),
            "average": normalize(per_user["msgs"].mean(), per_user["msgs"]),
        },
        {
            "metric": "Words",
            "user": normalize(mdf["word_count"].sum(), per_user["words"]),
            "average": normalize(per_user["words"].mean(), per_user["words"]),
        },
        {
            "metric": "Media",
            "user": normalize(mdf["is_media"].sum(), per_user["media"]),
            "average": normalize(per_user["media"].mean(), per_user["media"]),
        },
        {
            "metric": "Emojis",
            "user": normalize(mdf["emoji_count"].sum(), per_user["emojis"]),
            "average": normalize(per_user["emojis"].mean(), per_user["emojis"]),
        },
        {
            "metric": "Links",
            "user": normalize(mdf["has_url"].sum(), per_user["links"]),
            "average": normalize(per_user["links"].mean(), per_user["links"]),
        },
    ]

    # ── Hourly Activity ───────────────────────────────────────────────────
    hour_counts = mdf.groupby("hour").size().reindex(range(24), fill_value=0)
    hourly_activity = [
        {"hour": f"{h:02d}:00", "messages": int(hour_counts[h])}
        for h in range(24)
    ]

    # ── Monthly Activity ──────────────────────────────────────────────────
    mdf_copy = mdf.copy()
    mdf_copy["ym"] = mdf_copy["timestamp"].dt.to_period("M")
    monthly = mdf_copy.groupby("ym").size().reset_index(name="messages")
    monthly["month"] = monthly["ym"].dt.strftime("%b %Y")
    monthly = monthly.sort_values("ym")
    monthly_activity = monthly[["month", "messages"]].to_dict(orient="records")

    return {
        "profile": profile,
        "radar_data": radar_data,
        "hourly_activity": hourly_activity,
        "monthly_activity": monthly_activity,
    }


def get_all_members(df: pd.DataFrame) -> list[str]:
    """Return sorted list of all unique member names."""
    udf = _user_df(df)
    return sorted(udf["sender"].unique().tolist())
