# mydailyagents

Utility scripts for daily automated tasks — starting with email delivery via Gmail SMTP.

---

## send_digest.py

Sends a plain-text email through Gmail using an App Password. No external dependencies — pure Python stdlib.

### Prerequisites: Gmail App Password

Your regular Gmail password won't work here. You need a 16-character **App Password**:

1. Go to [myaccount.google.com](https://myaccount.google.com)
2. Navigate to **Security** → **2-Step Verification** (must be enabled)
3. Scroll down to **App Passwords**
4. Create one — name it something like "Daily Digest Script"
5. Copy the 16-character password (format: `xxxx xxxx xxxx xxxx`)

### Setup

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
# edit .env and set GMAIL_APP_PASSWORD
```

Then export the variables before running:

```bash
export GMAIL_FROM=jaipotnuri7@gmail.com
export GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
```

Or source a `.env` file:

```bash
set -a && source .env && set +a
```

### Usage

```bash
# Basic test
python send_digest.py --subject "Test" --body "Hello from the digest script"

# Send to a specific recipient
python send_digest.py --to someone@example.com --subject "Daily Digest" --body "Here's your update..."

# Multi-line body
python send_digest.py --subject "Daily Summary" --body "Line 1\nLine 2\nLine 3"
```

### Arguments

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `--to` | No | jaipotnuri7@gmail.com | Recipient email address |
| `--subject` | Yes | — | Email subject line |
| `--body` | Yes | — | Plain text body (supports `\n` newlines) |

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GMAIL_APP_PASSWORD` | **Yes** | — | 16-char Gmail App Password |
| `GMAIL_FROM` | No | jaipotnuri7@gmail.com | Sender address |

### Security note

**Never commit `.env` or your App Password to git.** `.env` is in `.gitignore` by convention — double-check before pushing. The `.env.example` file (with placeholder values) is safe to commit.

If your App Password is ever exposed, revoke it immediately at myaccount.google.com → Security → App Passwords.
