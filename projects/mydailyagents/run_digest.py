#!/usr/bin/env python3
"""
run_digest.py — Native macOS daily digest runner.
Reads Apple Notes via osascript, builds the email, sends via SMTP.
Runs outside Cowork sandbox so it has full network access.
"""

import os
import sys
import subprocess
import re
import smtplib
import argparse
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from pathlib import Path
from zoneinfo import ZoneInfo

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

SCRIPT_DIR = Path(__file__).parent
TO_EMAIL = "jaipotnuri7@gmail.com"
NOTE_NAME = "2026 - To Do"
LOCAL_TZ = ZoneInfo("America/Chicago")


def now_local() -> datetime:
    """Current time in the user's local timezone (independent of system TZ)."""
    return datetime.now(LOCAL_TZ)

# ---------------------------------------------------------------------------
# Load .env if present
# ---------------------------------------------------------------------------

def load_env():
    env_path = SCRIPT_DIR / ".env"
    if env_path.exists():
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, _, val = line.partition("=")
                    os.environ.setdefault(key.strip(), val.strip())

# ---------------------------------------------------------------------------
# Read Apple Note
# ---------------------------------------------------------------------------

APPLESCRIPT = """
tell application "Notes"
    set targetNote to missing value
    repeat with n in notes
        if name of n is "{note_name}" then
            set targetNote to n
            exit repeat
        end if
    end repeat
    if targetNote is missing value then
        return "ERROR: Note not found"
    end if
    return body of targetNote
end tell
""".strip()

_HTML_ENTITIES = {"&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&#39;": "'", "&quot;": '"'}


def _clean_html_fragment(fragment: str) -> str:
    """Strip tags + decode common entities + collapse whitespace."""
    text = re.sub(r"<[^>]+>", " ", fragment)
    for entity, char in _HTML_ENTITIES.items():
        text = text.replace(entity, char)
    return re.sub(r"\s+", " ", text).strip()


def get_note_items(note_name: str) -> list[str]:
    """Return the to-do list items from the Apple Note.

    Extracts only <li> elements from the first <ol>/<ul> block so headings
    and section labels (e.g. "AI projects") are excluded.
    """
    script = APPLESCRIPT.format(note_name=note_name)
    try:
        result = subprocess.run(
            ["osascript", "-e", script],
            capture_output=True, text=True, timeout=15
        )
        html = result.stdout.strip()
        if html.startswith("ERROR"):
            print(f"  Notes: {html}", file=sys.stderr)
            return []
        # Find the first ordered/unordered list — that's the to-do list.
        list_match = re.search(r"<(ol|ul)\b[^>]*>(.*?)</\1>", html, re.IGNORECASE | re.DOTALL)
        if not list_match:
            return []
        # Extract each <li>...</li>
        raw_items = re.findall(r"<li\b[^>]*>(.*?)</li>", list_match.group(2), re.IGNORECASE | re.DOTALL)
        items = [_clean_html_fragment(raw) for raw in raw_items]
        return [item for item in items if item]
    except Exception as e:
        print(f"  Notes read error: {e}", file=sys.stderr)
        return []

# ---------------------------------------------------------------------------
# Send via SMTP
# ---------------------------------------------------------------------------

def send_email(subject: str, body: str) -> bool:
    gmail_from = os.environ.get("GMAIL_FROM", TO_EMAIL)
    app_password = os.environ.get("GMAIL_APP_PASSWORD", "")

    if not app_password:
        print("ERROR: GMAIL_APP_PASSWORD not set. Add it to .env or export it.", file=sys.stderr)
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = gmail_from
    msg["To"] = TO_EMAIL
    msg.attach(MIMEText(body, "plain"))

    try:
        with smtplib.SMTP("smtp.gmail.com", 587, timeout=20) as server:
            server.starttls()
            server.login(gmail_from, app_password)
            server.sendmail(gmail_from, [TO_EMAIL], msg.as_string())
        return True
    except smtplib.SMTPAuthenticationError:
        print("ERROR: Gmail authentication failed. Check your App Password.", file=sys.stderr)
        return False
    except Exception as e:
        print(f"ERROR: SMTP send failed: {e}", file=sys.stderr)
        return False

# ---------------------------------------------------------------------------
# Flag file — skip if Option 1 (Chrome MCP) already sent today
# ---------------------------------------------------------------------------

FLAG_DIR = SCRIPT_DIR / "logs"

def get_flag_path() -> Path:
    date_str = now_local().strftime("%Y-%m-%d")
    return FLAG_DIR / f"sent-{date_str}.flag"

def already_sent_today() -> bool:
    flag = get_flag_path()
    if flag.exists():
        print(f"  ✓ Option 1 already sent today (flag: {flag.name}). Skipping SMTP.")
        return True
    return False

def write_sent_flag():
    FLAG_DIR.mkdir(parents=True, exist_ok=True)
    flag = get_flag_path()
    flag.write_text(f"sent via SMTP at {now_local().isoformat()}\n")

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    load_env()

    # Exit early if Option 1 (Cowork Chrome MCP) already succeeded today
    if already_sent_today():
        sys.exit(0)

    today = now_local().strftime("%A, %B %d, %Y")
    subject = f"🗓 Daily Digest — {today}"

    print("Step 1 — Reading Apple Notes...")
    items = get_note_items(NOTE_NAME)

    if items:
        todo1 = items[0] if len(items) > 0 else "No items found"
        todo2 = items[1] if len(items) > 1 else "No second item"
        print(f"  ✓ Got {len(items)} items. Top 2: '{todo1[:50]}', '{todo2[:50]}'")
    else:
        todo1 = "Could not read Apple Note — check Notes app"
        todo2 = "Run manually to debug"
        print("  ✗ Could not read note items")

    body = f"""Good morning, Jai!

📝 Top To-Dos
1. {todo1}
2. {todo2}

📅 Today's Meetings
No meetings scheduled today.

---
Have a great day!

(Sent via SMTP fallback — launchd native runner)"""

    print(f"\nStep 2 — Sending email: {subject}")
    success = send_email(subject, body)

    if success:
        print(f"  ✓ Email sent to {TO_EMAIL}")
        write_sent_flag()
        sys.exit(0)
    else:
        print(f"  ✗ Email failed")
        sys.exit(1)

if __name__ == "__main__":
    main()
