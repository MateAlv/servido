import logging
from dataclasses import dataclass

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


def send_mail(mail: Mail) -> None:
    """Sends with the backend chosen by MAIL_BACKEND: ses, memory or console (research R6)."""
    if settings.mail_backend == "ses":
        send_with_ses(mail)
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
