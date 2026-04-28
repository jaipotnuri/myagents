#!/usr/bin/env python3
"""
send_digest.py — Send a daily digest email via Gmail SMTP.

Usage:
    python send_digest.py --subject "Daily Digest" --body "Hello, world!"
    python send_digest.py --to recipient@example.com --subject "Test" --body "Hi"

Environment variables required:
    GMAIL_APP_PASSWORD  — Gmail App Password (16-char, from Google Account → Security → App Passwords)
    GMAIL_FROM          — Sender address (optional, defaults to jaipotnuri7@gmail.com)
"""

import argparse
import os
import smtplib
import sys
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 587
DEFAULT_EMAIL = "jaipotnuri7@gmail.com"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Send a daily digest email via Gmail SMTP."
    )
    parser.add_argument(
        "--to",
        default=DEFAULT_EMAIL,
        help=f"Recipient email address (default: {DEFAULT_EMAIL})",
    )
    parser.add_argument(
        "--subject",
        required=True,
        help="Email subject line",
    )
    parser.add_argument(
        "--body",
        required=True,
        help="Email body text (plain text, newlines supported)",
    )
    return parser.parse_args()


def send_email(to: str, subject: str, body: str) -> None:
    """Send a plain-text email via Gmail SMTP using STARTTLS."""
    gmail_from = os.environ.get("GMAIL_FROM", DEFAULT_EMAIL)
    app_password = os.environ.get("GMAIL_APP_PASSWORD", "")

    if not app_password:
        raise ValueError(
            "GMAIL_APP_PASSWORD environment variable is not set.\n"
            "Generate one at: myaccount.google.com → Security → 2-Step Verification → App Passwords"
        )

    # Build the message
    msg = MIMEMultipart("alternative")
    msg["From"] = gmail_from
    msg["To"] = to
    msg["Subject"] = subject

    # Attach plain-text body
    msg.attach(MIMEText(body, "plain", "utf-8"))

    # Connect and send
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.login(gmail_from, app_password)
        server.sendmail(gmail_from, to, msg.as_string())


def main() -> int:
    args = parse_args()

    try:
        send_email(to=args.to, subject=args.subject, body=args.body)
        print(f"✓ Email sent successfully to {args.to}")
        print(f"  Subject: {args.subject}")
        return 0
    except ValueError as exc:
        print(f"✗ Configuration error: {exc}", file=sys.stderr)
        return 1
    except smtplib.SMTPAuthenticationError:
        print(
            "✗ Authentication failed.\n"
            "  Make sure GMAIL_APP_PASSWORD is a valid App Password (not your regular Gmail password).\n"
            "  Generate one at: myaccount.google.com → Security → 2-Step Verification → App Passwords",
            file=sys.stderr,
        )
        return 1
    except smtplib.SMTPException as exc:
        print(f"✗ SMTP error: {exc}", file=sys.stderr)
        return 1
    except OSError as exc:
        print(f"✗ Network error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
