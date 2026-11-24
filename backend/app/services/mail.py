import logging
import smtplib
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from email.message import EmailMessage
from email.utils import formataddr
from html import escape

import boto3
from botocore.exceptions import BotoCoreError, ClientError

from app.config import settings

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class Mail:
    to: str
    subject: str
    text: str
    html: str


class MailError(Exception):
    """The mail could not be handed to the mail service."""


# The "memory" backend keeps the mails here so tests can read them.
outbox: list[Mail] = []


def restaurant_cancellation_mail(
    to: str, restaurant_name: str, reservation_text: str, refund_text: str = ""
) -> Mail:
    text = (
        f"El restaurante {restaurant_name} canceló tu reserva de {reservation_text}.{refund_text}"
    )
    return Mail(
        to=to,
        subject=f"Se canceló tu reserva en {restaurant_name}",
        text=text,
        html=f"<p>{text}</p>",
    )


def reservation_code(reservation_id: str) -> str:
    """The short code the diner reads (US-54), the same one the confirmation screen shows."""
    return reservation_id[:8].upper()


def reservation_confirmation_mail(
    to: str,
    restaurant_name: str,
    restaurant_address: str | None,
    starts_at: datetime,
    ends_at: datetime,
    party_size: int,
    table_capacity: int,
    seating_area: str,
    reservation_id: str,
) -> Mail:
    address = restaurant_address or "Dirección no informada"
    seating_area_label = {
        "indoor": "Adentro",
        "outdoor": "Afuera",
        "terrace": "Terraza",
    }.get(seating_area, seating_area)
    text = (
        f"Tu reserva en {restaurant_name} está confirmada. "
        f"Dirección: {address}. "
        f"Fecha: {starts_at:%d/%m/%Y}. "
        f"Horario: {starts_at:%H:%M} a {ends_at:%H:%M}. "
        f"Personas: {party_size}. "
        f"Mesa para {table_capacity} · {seating_area_label}. "
        f"Código de reserva: {reservation_code(reservation_id)}."
    )
    return Mail(
        to=to,
        subject=f"Confirmación de tu reserva en {restaurant_name}",
        text=text,
        html=f"<p>{text}</p>",
    )


def pesos(amount: Decimal) -> str:
    """«$ 37.000» or «$ 37.000,50», as Argentina writes money."""
    whole, cents = f"{amount:,.2f}".replace(",", " ").split(".")
    text = whole.replace(" ", ".") + ("" if cents == "00" else f",{cents}")
    return f"$ {text}"


INK = "#3b1f18"
MUTED = "#6b4a40"
CREAM = "#fdf9ee"
LINE = "#eadfca"
SUNKEN = "#f4ecdc"
PRIMARY = "#d2441c"


def branded_html(title: str, preheader: str, body: str) -> str:
    """A mail in Servido!'s colors with its logo; tables and inline styles, as mail clients need."""
    logo = escape(f"{settings.app_base_url}/servido-logo.png")
    return (
        f'<div style="display:none;max-height:0;overflow:hidden">{escape(preheader)}</div>'
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
        f'style="background:{SUNKEN};padding:24px 12px;font-family:Nunito,Arial,sans-serif;'
        f'color:{INK}"><tr><td align="center">'
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
        f'style="max-width:520px;background:{CREAM};border-radius:20px;'
        f'border:1px solid {LINE}">'
        f'<tr><td align="center" style="padding:28px 28px 8px">'
        f'<img src="{logo}" width="96" height="96" alt="Servido!" '
        f'style="display:block;border:0;width:96px;height:96px"></td></tr>'
        f'<tr><td style="padding:8px 28px 4px;text-align:center">'
        f'<h1 style="margin:0;font-size:24px;line-height:1.2;color:{INK}">{escape(title)}</h1>'
        f"</td></tr>"
        f'<tr><td style="padding:12px 28px 28px">{body}</td></tr>'
        f"</table>"
        f'<p style="margin:16px 0 0;font-size:12px;color:{MUTED}">'
        f"Servido! · Reservá. Pedí. Disfrutá.</p>"
        f"</td></tr></table>"
    )


def payment_receipt_mail(
    to: str,
    restaurant_name: str,
    reservation_start: datetime,
    items: list[tuple[str, int, Decimal]],
    discount: Decimal,
    total: Decimal,
    operation_number: str,
    card: str,
    paid_at: datetime,
    order_url: str,
    test_mode: bool,
) -> Mail:
    """The receipt of an approved electronic payment (spec 032, E3)."""
    when = f"{reservation_start:%d/%m/%Y} a las {reservation_start:%H:%M}"
    rows = [(f"{quantity} × {name}", pesos(subtotal)) for name, quantity, subtotal in items]
    if discount:
        rows.append(("Descuento", f"−{pesos(discount)}"))
    test_note = "Modo de prueba: no se cobró dinero real." if test_mode else ""
    text = "\n".join(
        [
            f"Pagaste tu pedido en {restaurant_name} para la reserva del {when}.",
            "",
            *[f"{label}: {amount}" for label, amount in rows],
            f"Total pagado (incluye la seña de tu reserva): {pesos(total)}",
            "",
            f"Operación N° {operation_number} · {card} · {paid_at:%d/%m/%Y %H:%M}.",
            f"Ver tu pedido: {order_url}",
            *([test_note] if test_note else []),
        ]
    )
    cell = f"padding:6px 0;border-bottom:1px dashed {LINE};font-size:15px"
    rows_html = "".join(
        f'<tr><td style="{cell}">{escape(label)}</td>'
        f'<td align="right" style="{cell};white-space:nowrap">{escape(amount)}</td></tr>'
        for label, amount in rows
    )
    detail = f"padding:3px 0;font-size:13px;color:{MUTED}"
    body = (
        f'<p style="margin:0 0 16px;text-align:center;font-size:15px;color:{MUTED}">'
        f"{escape(restaurant_name)} · reserva del {escape(when)}</p>"
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
        f'style="background:#ffffff;border-radius:12px;padding:14px 16px">'
        f"{rows_html}"
        f'<tr><td style="padding:10px 0 0;font-size:17px;font-weight:800">Total pagado</td>'
        f'<td align="right" style="padding:10px 0 0;font-size:22px;font-weight:800">'
        f"{escape(pesos(total))}</td></tr>"
        f'<tr><td colspan="2" style="padding:2px 0 0;font-size:12px;color:{MUTED}">'
        f"Incluye la seña de tu reserva · Impuestos incluidos</td></tr></table>"
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
        f'style="margin-top:14px">'
        f'<tr><td style="{detail}">Operación</td><td align="right" style="{detail}">'
        f"N° {escape(operation_number)}</td></tr>"
        f'<tr><td style="{detail}">Tarjeta</td><td align="right" style="{detail}">'
        f"{escape(card)}</td></tr>"
        f'<tr><td style="{detail}">Fecha</td><td align="right" style="{detail}">'
        f"{paid_at:%d/%m/%Y %H:%M}</td></tr></table>"
        f'<p style="margin:22px 0 0;text-align:center">'
        f'<a href="{escape(order_url)}" style="display:inline-block;background:{PRIMARY};'
        f"color:#ffffff;text-decoration:none;font-weight:800;padding:12px 24px;"
        f'border-radius:999px">Ver mi pedido</a></p>'
        + (
            f'<p style="margin:18px 0 0;text-align:center;font-size:12px;color:{MUTED}">'
            f"{escape(test_note)}</p>"
            if test_note
            else ""
        )
    )
    return Mail(
        to=to,
        subject=f"Comprobante de pago de tu pedido en {restaurant_name}",
        text=text,
        html=branded_html(
            "¡Pagaste tu pedido!", f"Pagaste {pesos(total)} en {restaurant_name}", body
        ),
    )


def send_mail(mail: Mail) -> None:
    """Sends with the backend chosen by MAIL_BACKEND: ses, smtp, memory or console (research R6)."""
    if settings.mail_backend == "ses":
        send_with_ses(mail)
    elif settings.mail_backend == "smtp":
        send_with_smtp(mail)
    elif settings.mail_backend == "memory":
        outbox.append(mail)
    else:
        logger.warning("Mail not sent (MAIL_BACKEND=console) to %s:\n%s", mail.to, mail.text)


def send_with_ses(mail: Mail) -> None:
    # On the instance, boto3 takes the credentials of the instance role: there are no keys.
    client = boto3.client("sesv2", region_name=settings.aws_region)
    try:
        client.send_email(
            FromEmailAddress=settings.mail_from,
            Destination={"ToAddresses": [mail.to]},
            Content={
                "Simple": {
                    "Subject": {"Data": mail.subject, "Charset": "UTF-8"},
                    "Body": {
                        "Text": {"Data": mail.text, "Charset": "UTF-8"},
                        "Html": {"Data": mail.html, "Charset": "UTF-8"},
                    },
                }
            },
        )
    except (BotoCoreError, ClientError) as error:
        raise MailError(str(error)) from error


def send_with_smtp(mail: Mail) -> None:
    # Gmail rewrites any other sender to the account's own address, so the mail comes from it.
    message = EmailMessage()
    message["From"] = formataddr(("Servido!", settings.smtp_username))
    message["To"] = mail.to
    message["Subject"] = mail.subject
    message.set_content(mail.text)
    message.add_alternative(mail.html, subtype="html")
    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
            server.starttls()
            server.login(settings.smtp_username, settings.smtp_password)
            server.send_message(message)
    except (OSError, smtplib.SMTPException) as error:
        raise MailError(str(error)) from error
