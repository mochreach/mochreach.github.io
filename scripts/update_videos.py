#!/usr/bin/env python3
"""Refresh _data/videos.json and _data/channel.json from the Mo Chreach! YouTube channel.

Uses yt-dlp (from PATH, or `nix run nixpkgs#yt-dlp`), so it only sees public videos. Run it from the repo root:

    python3 scripts/update_videos.py

Topics come from TOPICS below, matched against each video's title; a video can have several. Add a rule when a new device or series turns up.
"""

import json
import os
import re
import shutil
import subprocess
import sys
from datetime import datetime, timezone

CHANNEL = "https://www.youtube.com/@mochreach"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "_data")

# (topic, regex on the lowercased title). Order is the order of the filter buttons on the page.
TOPICS = [
    ("OP-XY", r"op-?xy"),
    ("EP-133", r"ep[- ]?133|k\.?o\.? ?ii"),
    ("OP-Z", r"op-?z\b|\bopz"),
    ("Pocket Operators", r"pocket operator"),
    ("SP-404", r"sp-?404"),
    ("Elektron", r"digitone|digitakt|elektron"),
    ("MIDI Surf", r"midi surf"),
    ("Coding", r"python|rust|programming|coding|fundsp"),
    ("Jams", r"live perform|jamuary|\blive \"|vocoder song|synth line|patch!"),
]


def ytdlp() -> list[str]:
    if shutil.which("yt-dlp"):
        return ["yt-dlp"]
    return ["nix", "run", "nixpkgs#yt-dlp", "--"]


def run(args: list[str]) -> str:
    out = subprocess.run(ytdlp() + args, capture_output=True, text=True)
    if out.returncode and not out.stdout:
        sys.exit(f"yt-dlp failed: {out.stderr.strip().splitlines()[-1:]}")
    return out.stdout


def tab(name: str) -> dict:
    return json.loads(run(["--flat-playlist", "-J", f"{CHANNEL}/{name}"]))


def clean_title(title: str) -> str:
    title = re.sub(r"(\s*#\w+)+\s*$", "", title)  # trailing hashtags go; inline ones lose the #
    title = re.sub(r"#(\w+)", r"\1", title)
    title = re.sub(r"[\U0001F300-\U0001FAFF]+", "", title)
    title = re.sub(r"\s{2,}", " ", title).strip(" |")
    return title[:1].upper() + title[1:]


def summary(description: str) -> str:
    """The first paragraph of the description, without links or hashtags."""
    for para in re.split(r"\n\s*\n", description or ""):
        para = re.sub(r"\s+", " ", re.sub(r"\(?https?://\S+\)?|#\w+", "", para)).strip()
        if len(para) > 40 and "join this channel" not in para.lower():
            if len(para) <= 220:
                return para
            sentences = re.findall(r".+?[.!?]+(?=\s|$)", para)  # not at the dots in "1.2.0"
            out = ""
            for sentence in sentences:
                if len(out) + len(sentence) > 220:
                    break
                out += sentence
            return out.strip() or para[:217].rsplit(" ", 1)[0] + "…"
    return ""


def count(n: int) -> str:
    """2780 -> 2.8k, 70247 -> 70k, 256388 -> 256k."""
    if n < 1000:
        return str(n)
    k = n / 1000
    return f"{k:.1f}".rstrip("0").rstrip(".") + "k" if k < 10 else f"{round(k)}k"


def length(seconds: int) -> str:
    h, rest = divmod(seconds, 3600)
    m, s = divmod(rest, 60)
    return f"{h}:{m:02}:{s:02}" if h else f"{m}:{s:02}"


def main() -> None:
    videos = tab("videos")
    kinds = {e["id"]: "video" for e in videos["entries"]}
    for name, kind in (("streams", "stream"), ("shorts", "short")):
        kinds.update({e["id"]: kind for e in tab(name)["entries"]})

    urls = [f"https://youtu.be/{i}" for i in kinds]
    lines = run(["--skip-download", "--ignore-errors", "-j", *urls]).splitlines()

    out = []
    for line in lines:
        v = json.loads(line)
        if v.get("availability") not in (None, "public"):
            continue  # members-only and the like
        topics = [t for t, rx in TOPICS if re.search(rx, v["title"].lower())]
        kind = kinds[v["id"]]
        date = datetime.strptime(v["upload_date"], "%Y%m%d")
        views = v.get("view_count") or 0
        out.append({
            "id": v["id"],
            "url": f"https://www.youtube.com/{'shorts/' if kind == 'short' else 'watch?v='}{v['id']}",
            "title": clean_title(v["title"]),
            "date": date.strftime("%Y-%m-%d"),
            "month": date.strftime("%b %Y"),
            "duration": v.get("duration") or 0,
            "length": length(v.get("duration") or 0),
            "views": views,
            "views_label": count(views),
            "kind": kind,
            "topics": topics,
            "summary": summary(v.get("description", "")),
            "chapters": len(v.get("chapters") or []),
        })
    out.sort(key=lambda v: v["date"], reverse=True)

    channel = {
        "name": videos.get("channel"),
        "url": CHANNEL,
        "subscribers": videos.get("channel_follower_count"),
        "subscribers_label": count(videos.get("channel_follower_count") or 0),
        "videos": len(out),
        "views": sum(v["views"] for v in out),
        "views_label": count(sum(v["views"] for v in out)),
        "topics": [t for t, _ in TOPICS if any(t in v["topics"] for v in out)],
        "updated": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
    }

    os.makedirs(DATA, exist_ok=True)
    with open(os.path.join(DATA, "videos.json"), "w") as f:
        json.dump(out, f, indent=1, ensure_ascii=False)
        f.write("\n")
    with open(os.path.join(DATA, "channel.json"), "w") as f:
        json.dump(channel, f, indent=1, ensure_ascii=False)
        f.write("\n")
    print(f"{len(out)} videos, {channel['subscribers']} subscribers, {channel['views']} views")


if __name__ == "__main__":
    main()
