"""
analyzer.py — Chat Statistics Generator (No pandas, pure Python)
================================================================
All analytical functions operate on the plain list-of-dicts that
parser.py returns. Uses only the Python standard library:
  collections.Counter, collections.defaultdict, itertools, re, emoji

Zero C extensions → builds instantly on any Python version.
"""

import re
from collections import Counter, defaultdict
from typing import Any
import emoji as emoji_lib


# ─────────────────────────────────────────────
#  Stopwords for Word Cloud
# ─────────────────────────────────────────────

STOPWORDS = {
    "the","a","an","and","or","but","in","on","at","to","for","of","with",
    "by","from","up","about","into","through","is","are","was","were","be",
    "been","being","have","has","had","do","does","did","will","would",
    "could","should","may","might","shall","can","not","no","nor","so",
    "yet","both","either","neither","such","that","this","these","those",
    "i","me","my","we","our","you","your","he","she","it","they","them",
    "his","her","its","their","who","which","what","all","just","like",
    "ok","okay","yes","yeah","yep","nope","lol","haha","hahaha","oh","ah",
    "hmm","um","hi","hey","hello","thanks","thank","please","also","really",
    "very","more","much","many","some","any","how","when","where","why",
    "there","here","if","then","than","too","only","still","even","get",
    "got","go","come","know","think","want","see","one","two","time","day",
    "good","well","said","message","media","omitted","deleted","null","none",
    # Timestamp artifacts
    "am","pm",
    # Hindi/Marathi filler
    "ka","ki","ke","ko","se","ne","ye","wo","jo","kya","aur","hai","ho",
    "na","ni","bhi","toh","ab","sb","ek","ds","dse","aahe","ahe","cha",
    # Chat noise
    "changed","tap","curr","edited","informed","dear","batch","re",
}


# ─────────────────────────────────────────────
#  Helpers
# ─────────────────────────────────────────────

def _user_rows(rows: list[dict]) -> list[dict]:
    """Return only real user messages (exclude system messages)."""
    return [r for r in rows if not r["is_system"] and r["message"].strip()]


def _group_by(rows: list[dict], key: str) -> dict:
    """Group list of dicts by a key → {key_value: [rows]}."""
    result = defaultdict(list)
    for r in rows:
        result[r[key]].append(r)
    return dict(result)


# ─────────────────────────────────────────────
#  1. Global Stats
# ─────────────────────────────────────────────

def get_global_stats(rows: list[dict]) -> dict[str, Any]:
    urows = _user_rows(rows)
    if not urows:
        return {}

    senders   = [r["sender"] for r in urows]
    sender_counts = Counter(senders)
    all_ts    = [r["timestamp"] for r in rows]

    return {
        "total_messages":    len(urows),
        "total_participants": len(set(senders)),
        "media_count":       sum(1 for r in urows if r["is_media"]),
        "links_shared":      sum(1 for r in urows if r["has_url"]),
        "first_date":        str(min(all_ts).date()),
        "last_date":         str(max(all_ts).date()),
        "most_active_user":  sender_counts.most_common(1)[0][0],
        "total_emojis":      sum(r["emoji_count"] for r in urows),
        "total_words":       sum(r["word_count"]  for r in urows),
    }


# ─────────────────────────────────────────────
#  2. Temporal Analysis
# ─────────────────────────────────────────────

def get_hourly_heatmap(rows: list[dict]) -> list[dict]:
    """GitHub-style heatmap: day-of-week × hour → count."""
    urows = _user_rows(rows)
    counts = Counter((r["day_short"], r["hour"]) for r in urows)
    result = []
    for day in ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]:
        for hour in range(24):
            result.append({
                "day":   day,
                "hour":  hour,
                "count": counts.get((day, hour), 0),
            })
    return result


def get_day_of_week_stats(rows: list[dict]) -> list[dict]:
    """Message count by day of week, Mon→Sun."""
    urows  = _user_rows(rows)
    counts = Counter(r["day_of_week"] for r in urows)
    order  = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]
    return [{"day": d[:3], "messages": counts.get(d, 0)} for d in order]


def get_monthly_timeline(rows: list[dict]) -> list[dict]:
    """Message count per calendar month, sorted chronologically."""
    urows = _user_rows(rows)

    # Build (year, month) → count
    counts = defaultdict(int)
    labels = {}
    for r in urows:
        ts = r["timestamp"]
        key = (ts.year, ts.month)
        counts[key] += 1
        labels[key] = r["month_year"]

    sorted_keys = sorted(counts.keys())
    return [{"month": labels[k], "messages": counts[k]} for k in sorted_keys]


# ─────────────────────────────────────────────
#  3. Content Stats
# ─────────────────────────────────────────────

def get_message_breakdown(rows: list[dict]) -> list[dict]:
    """Donut chart: Text vs Media vs Emoji-only."""
    urows     = _user_rows(rows)
    media     = sum(1 for r in urows if r["is_media"])
    emoji_only = sum(1 for r in urows
                     if r["emoji_count"] > 0 and not r["is_media"] and r["word_count"] == 0)
    text      = max(len(urows) - media - emoji_only, 0)
    return [
        {"name": "Text",       "value": text},
        {"name": "Media",      "value": media},
        {"name": "Emoji Only", "value": emoji_only},
    ]


def get_top_emojis(rows: list[dict], n: int = 6) -> list[dict]:
    """Top N emojis across the whole chat."""
    urows = _user_rows(rows)
    all_emojis = [e for r in urows for e in r["emojis"]]
    return [{"emoji": e, "count": c} for e, c in Counter(all_emojis).most_common(n)]


def get_leaderboard(rows: list[dict], n: int = 10) -> list[dict]:
    """Top N users by message count."""
    urows  = _user_rows(rows)
    total  = len(urows)
    counts = Counter(r["sender"] for r in urows)
    result = []
    for rank, (name, msgs) in enumerate(counts.most_common(n), start=1):
        result.append({
            "name":       name,
            "messages":   msgs,
            "percentage": round(msgs / total * 100, 1),
            "rank":       rank,
        })
    return result


def get_word_cloud(rows: list[dict], n: int = 60) -> list[dict]:
    """Top N words after stopword filtering."""
    urows = _user_rows(rows)
    text  = " ".join(r["message"] for r in urows)
    text  = re.sub(r"https?://\S+", "", text)
    text  = emoji_lib.replace_emoji(text, replace="")
    words = re.findall(r"\b[a-zA-Z]{2,}\b", text.lower())
    filtered = [w for w in words if w not in STOPWORDS]
    counter  = Counter(filtered).most_common(n)
    if not counter:
        return []
    max_count = counter[0][1]
    return [{"text": w, "value": round(c / max_count * 100)} for w, c in counter]


# ─────────────────────────────────────────────
#  4. Hall of Shame
# ─────────────────────────────────────────────

def get_hall_of_shame(rows: list[dict]) -> dict[str, Any]:
    urows   = _user_rows(rows)
    awards  = {}
    by_user = _group_by(urows, "sender")

    if not by_user:
        return awards

    # ── 1. Ghost (least active) ───────────────────────────────────────────
    msg_counts = {u: len(msgs) for u, msgs in by_user.items()}
    ghost = min(msg_counts, key=msg_counts.get)
    awards["ghost"] = {
        "winner": ghost,
        "stat_label": "Total Messages",
        "stat_value": msg_counts[ghost],
        "funny_subtitle": "Joined the group, chose violence by staying silent.",
    }

    # ── 2. Novelist (highest avg char count) ─────────────────────────────
    avg_chars = {u: sum(r["char_count"] for r in msgs) / len(msgs)
                 for u, msgs in by_user.items()}
    novelist = max(avg_chars, key=avg_chars.get)
    awards["novelist"] = {
        "winner": novelist,
        "stat_label": "Avg. Characters/Msg",
        "stat_value": round(avg_chars[novelist], 1),
        "funny_subtitle": "Every reply is a TED talk nobody asked for.",
    }

    # ── 3. Spammer (most consecutive messages) ────────────────────────────
    sorted_rows  = sorted(urows, key=lambda r: r["timestamp"])
    max_streak, spammer, curr_streak, curr_person = 0, "", 1, ""
    for r in sorted_rows:
        if r["sender"] == curr_person:
            curr_streak += 1
            if curr_streak > max_streak:
                max_streak, spammer = curr_streak, curr_person
        else:
            curr_streak, curr_person = 1, r["sender"]
    if spammer:
        awards["spammer"] = {
            "winner": spammer,
            "stat_label": "Consecutive Messages",
            "stat_value": max_streak,
            "funny_subtitle": "Discovered 'Reply' is not a suggestion.",
        }

    # ── 4. Emoji Overload ─────────────────────────────────────────────────
    emoji_totals = {u: sum(r["emoji_count"] for r in msgs)
                    for u, msgs in by_user.items()}
    emoji_king = max(emoji_totals, key=emoji_totals.get)
    awards["emoji_overload"] = {
        "winner": emoji_king,
        "stat_label": "Total Emojis Used",
        "stat_value": emoji_totals[emoji_king],
        "funny_subtitle": "Words? Never heard of them. 🔥💀🤣🔥",
    }

    # ── 5. Night Owl (1 AM – 4 AM) ───────────────────────────────────────
    night_rows = [r for r in urows if 1 <= r["hour"] <= 4]
    if night_rows:
        owl = Counter(r["sender"] for r in night_rows).most_common(1)[0][0]
        awards["night_owl"] = {
            "winner": owl,
            "stat_label": "Late Night Messages",
            "stat_value": Counter(r["sender"] for r in night_rows)[owl],
            "funny_subtitle": "Sleep is a concept. The group chat is life.",
        }

    # ── 6. Question Machine ───────────────────────────────────────────────
    q_counts = {u: sum(r["message"].count("?") for r in msgs)
                for u, msgs in by_user.items()}
    questioner = max(q_counts, key=q_counts.get)
    awards["question_machine"] = {
        "winner": questioner,
        "stat_label": "Question Marks Used",
        "stat_value": q_counts[questioner],
        "funny_subtitle": "Has questions. So many questions. Always questions.",
    }

    # ── 7. Media Lord ─────────────────────────────────────────────────────
    media_rows = [r for r in urows if r["is_media"]]
    if media_rows:
        lord = Counter(r["sender"] for r in media_rows).most_common(1)[0][0]
        awards["media_lord"] = {
            "winner": lord,
            "stat_label": "Media Files Sent",
            "stat_value": Counter(r["sender"] for r in media_rows)[lord],
            "funny_subtitle": "Singlehandedly filling everyone's storage.",
        }

    # ── 8. Early Bird (5 AM – 7 AM) ──────────────────────────────────────
    early_rows = [r for r in urows if 5 <= r["hour"] <= 7]
    if early_rows:
        bird = Counter(r["sender"] for r in early_rows).most_common(1)[0][0]
        awards["early_bird"] = {
            "winner": bird,
            "stat_label": "Early Morning Messages",
            "stat_value": Counter(r["sender"] for r in early_rows)[bird],
            "funny_subtitle": "Up before the sun. Texting before coffee.",
        }

    return awards


# ─────────────────────────────────────────────
#  5. Member Deep Dive
# ─────────────────────────────────────────────

def get_member_stats(rows: list[dict], member: str) -> dict[str, Any]:
    urows = _user_rows(rows)
    mrows = [r for r in urows if r["sender"] == member]

    if not mrows:
        raise ValueError(f"Member '{member}' not found in chat data.")

    total       = len(urows)
    member_total = len(mrows)
    by_user     = _group_by(urows, "sender")
    num_users   = len(by_user)

    # Rank (1 = most active)
    counts_sorted = sorted(by_user.items(), key=lambda x: len(x[1]), reverse=True)
    rank = next(i + 1 for i, (u, _) in enumerate(counts_sorted) if u == member)

    # ── Profile ───────────────────────────────────────────────────────────
    profile = {
        "name":               member,
        "total_messages":     member_total,
        "rank":               rank,
        "percentage_of_chat": round(member_total / total * 100, 1),
        "total_words":        sum(r["word_count"]  for r in mrows),
        "total_emojis":       sum(r["emoji_count"] for r in mrows),
        "total_media":        sum(1 for r in mrows if r["is_media"]),
        "total_links":        sum(1 for r in mrows if r["has_url"]),
        "avg_msg_length":     round(sum(r["char_count"] for r in mrows) / member_total, 1),
    }

    # ── Radar: normalize member value vs group max ────────────────────────
    def per_user_totals(key):
        return {u: sum(r[key] for r in msgs) for u, msgs in by_user.items()}

    def normalize(val, totals_dict):
        mx = max(totals_dict.values()) if totals_dict else 1
        return round(val / max(mx, 1) * 100, 1)

    msg_totals   = {u: len(msgs) for u, msgs in by_user.items()}
    word_totals  = per_user_totals("word_count")
    media_totals = {u: sum(1 for r in msgs if r["is_media"]) for u, msgs in by_user.items()}
    emoji_totals = per_user_totals("emoji_count")
    link_totals  = {u: sum(1 for r in msgs if r["has_url"]) for u, msgs in by_user.items()}

    def avg(d): return sum(d.values()) / max(len(d), 1)

    radar_data = [
        {"metric": "Messages", "user": normalize(member_total,                  msg_totals),
                                "average": normalize(avg(msg_totals),            msg_totals)},
        {"metric": "Words",    "user": normalize(profile["total_words"],         word_totals),
                                "average": normalize(avg(word_totals),           word_totals)},
        {"metric": "Media",    "user": normalize(profile["total_media"],         media_totals),
                                "average": normalize(avg(media_totals),          media_totals)},
        {"metric": "Emojis",   "user": normalize(profile["total_emojis"],        emoji_totals),
                                "average": normalize(avg(emoji_totals),          emoji_totals)},
        {"metric": "Links",    "user": normalize(profile["total_links"],         link_totals),
                                "average": normalize(avg(link_totals),           link_totals)},
    ]

    # ── Hourly Activity ───────────────────────────────────────────────────
    hour_counts = Counter(r["hour"] for r in mrows)
    hourly_activity = [
        {"hour": f"{h:02d}:00", "messages": hour_counts.get(h, 0)}
        for h in range(24)
    ]

    # ── Monthly Activity ──────────────────────────────────────────────────
    monthly_counts = defaultdict(int)
    monthly_labels = {}
    for r in mrows:
        ts  = r["timestamp"]
        key = (ts.year, ts.month)
        monthly_counts[key] += 1
        monthly_labels[key]  = r["month_year"]

    monthly_activity = [
        {"month": monthly_labels[k], "messages": monthly_counts[k]}
        for k in sorted(monthly_counts.keys())
    ]

    return {
        "profile":          profile,
        "radar_data":       radar_data,
        "hourly_activity":  hourly_activity,
        "monthly_activity": monthly_activity,
    }


def get_all_members(rows: list[dict]) -> list[str]:
    """Sorted list of all unique senders."""
    urows = _user_rows(rows)
    return sorted(set(r["sender"] for r in urows))
