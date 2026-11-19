"""SMTP transport."""

from __future__ import annotations

import smtplib
import ssl
from email.message import EmailMessage

from . import settings


def send_email(
    *,
    to: str,
    subject: str,
    body_text: str | None = None,
    body_html: str | None = None,
) -> None:
    if body_text is None and body_html is None:
        raise ValueError("Provide body_text and/or body_html")

    message = EmailMessage()
    message["From"] = settings.SMTP_FROM
    message["To"] = to
    message["Subject"] = subject

    if body_html and body_text is None:
        message.set_content(body_html, subtype="html")
    elif body_html:
        message.set_content(body_text)
        message.add_alternative(body_html, subtype="html")
    else:
        message.set_content(body_text)

    if settings.SMTP_USE_SSL:
        with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT) as smtp:
            if settings.SMTP_USER:
                smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            smtp.send_message(message)
        return

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as smtp:
        smtp.ehlo()
        if settings.SMTP_USE_TLS:
            smtp.starttls(context=ssl.create_default_context())
            smtp.ehlo()
        if settings.SMTP_USER:
            smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        smtp.send_message(message)


def send_test_email(to: str) -> None:
    """Send a fixed test message — use this to verify SMTP config."""
    send_email(
        to=to,
        subject="E-commerce SMTP test",
        body_text="If you read this, SMTP is working.",
        body_html="<p>If you read this, <strong>SMTP</strong> is working.</p>",
    )