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
        f"Código de reserva: {reservation_id}."
    )
    return Mail(
        to=to,
        subject=f"Confirmación de tu reserva en {restaurant_name}",
        text=text,
        html=f"<p>{text}</p>",
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
) -> Mail:
    """The receipt of an approved electronic payment (spec 032, E3)."""
    lines = [f"{quantity} × {name}: ${subtotal:.2f}" for name, quantity, subtotal in items]
    if discount:
        lines.append(f"Descuento: -${discount:.2f}")
    lines.append(f"Total pagado (incluye la seña de tu reserva): ${total:.2f}")
    header = (
        f"Pagaste tu pedido en {restaurant_name} para la reserva del "
        f"{reservation_start:%d/%m/%Y} a las {reservation_start:%H:%M}."
    )
    footer = f"Operación N° {operation_number} · {card} · {paid_at:%d/%m/%Y %H:%M}."
    text = "\n".join([header, "", *lines, "", footer])
    items_html = "".join(f"<li>{escape(line)}</li>" for line in lines)
    return Mail(
        to=to,
        subject=f"Comprobante de pago de tu pedido en {restaurant_name}",
        text=text,
        html=f"<p>{escape(header)}</p><ul>{items_html}</ul><p>{escape(footer)}</p>",
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
