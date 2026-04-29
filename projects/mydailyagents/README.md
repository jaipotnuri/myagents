# mydailyagents

Automated morning digest — every day at 8 AM, Jai gets an email containing the top 2 to-dos from his Apple Note `2026 - To Do` plus today's Google Calendar meetings.

The system has two redundant delivery paths so a missed cron run or a Cowork-down day still gets the email out.

---

## How it runs

Two coordinated runners take turns. Whichever one fires first writes a flag for the day; the other sees the flag and exits cleanly, so the inbox never gets a duplicate.

| Path | Trigger | Runner | Sends via |
|------|---------|--------|-----------|
| Option 1 (preferred) | Cowork scheduled task `notes-daily-digest`, cron `0 8 * * *` local | Claude session | Gmail web UI through Chrome MCP |
| Option 2 (fallback) | macOS launchd `com.jaipotnuri.daily-digest-smtp`, 8:05 AM local | `run_digest.py` | Gmail SMTP via App Password |
| Option 3 (last resort) | Manually invoked from the Cowork session | Claude session | Gmail MCP `create_draft` |

A 5-minute offset between Option 1 (8:00 AM) and Option 2 (8:05 AM) gives the Chrome MCP path room to finish before SMTP wakes up. Option 2 reads `logs/sent-YYYY-MM-DD.flag` (in America/Chicago) and exits 0 if it's already there.

---

## Files

```
mydailyagents/
├── run_digest.py                          # Option 2 SMTP runner (the main script)
├── send_digest.py                         # legacy minimal SMTP CLI (kept for ad-hoc sends)
├── com.jaipotnuri.daily-digest-smtp.plist # launchd job that runs run_digest.py at 8:05 AM
├── .env                                   # GMAIL_FROM + GMAIL_APP_PASSWORD (gitignored)
├── .env.example                           # template
├── .gitignore
├── logs/
│   ├── digest.log                         # stdout from launchd runs
│   ├── digest-error.log                   # stderr from launchd runs
│   └── sent-YYYY-MM-DD.flag               # written by whichever path sent first today
└── README.md
```

The Cowork scheduled task itself lives under `~/Documents/Claude/Scheduled/notes-daily-digest/SKILL.md` — that file holds the full Option 1 / Option 2 / Option 3 playbook.

---

## run_digest.py

Native-macOS runner that reads Apple Notes via `osascript`, builds the digest, and sends through Gmail SMTP.

Behavior:
1. Loads `.env` if present (no python-dotenv dep — pure stdlib).
2. Checks `logs/sent-YYYY-MM-DD.flag` (date in America/Chicago). If present, exits 0 — Option 1 already sent today.
3. Runs an AppleScript to fetch the body of the `2026 - To Do` note. Extracts only `<li>` items from the first `<ol>`/`<ul>` block, so headings and section labels (e.g. "AI projects") are skipped.
4. Composes subject `🗓 Daily Digest — <Weekday, Month DD, YYYY>` (date pinned to America/Chicago via `zoneinfo.ZoneInfo`, independent of system TZ).
5. SMTP-sends to `jaipotnuri7@gmail.com` over `smtp.gmail.com:587` with STARTTLS.
6. On success, writes `logs/sent-YYYY-MM-DD.flag` so the SKILL.md path also sees the day as done.

Exit codes: 0 on success or skip, 1 on send failure.

---

## Setup

### 1. Gmail App Password

The script needs an App Password (not your regular Gmail password). Two-step verification must be on.

1. Go to [myaccount.google.com](https://myaccount.google.com) → **Security** → **App Passwords**.
2. Create one — name it "mydailyagents".
3. Copy the 16-character password.

### 2. `.env`

```bash
cp .env.example .env
# edit .env and set:
#   GMAIL_FROM=jaipotnuri7@gmail.com
#   GMAIL_APP_PASSWORD=xxxxxxxxxxxxxxxx
```

`.env` is gitignored. Never commit it.

### 3. Install the launchd job (Option 2)

```bash
cp com.jaipotnuri.daily-digest-smtp.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.jaipotnuri.daily-digest-smtp.plist
```

The plist's hard-coded paths point at `/Users/jaipotnuri/myrepo/myagents/projects/mydailyagents/`. Edit it before loading if your repo lives elsewhere.

To unload later:
```bash
launchctl unload ~/Library/LaunchAgents/com.jaipotnuri.daily-digest-smtp.plist
```

### 4. The Cowork scheduled task (Option 1)

The `notes-daily-digest` task is already created in Cowork. To inspect or edit, look in the Cowork sidebar under Scheduled or open `~/Documents/Claude/Scheduled/notes-daily-digest/SKILL.md`.

---

## Manual run

```bash
cd ~/myrepo/myagents/projects/mydailyagents
python3 run_digest.py
```

If today's flag exists you'll get `✓ Option 1 already sent today (flag: ...). Skipping SMTP.` and exit 0. To force a send, delete the flag first:

```bash
rm -f logs/sent-$(TZ=America/Chicago date +%Y-%m-%d).flag
python3 run_digest.py
```

---

## send_digest.py (legacy)

A minimal CLI for ad-hoc test sends — handy when you want to fire off a quick email without rebuilding the digest body.

```bash
python send_digest.py --subject "Test" --body "hello"
```

| Argument | Required | Default |
|----------|----------|---------|
| `--to` | No | jaipotnuri7@gmail.com |
| `--subject` | Yes | — |
| `--body` | Yes | — |

Same `.env` (`GMAIL_FROM`, `GMAIL_APP_PASSWORD`) applies.

---

## Security

`.env` and the App Password should never hit the repo. If the password leaks, revoke it immediately at myaccount.google.com → Security → App Passwords.
