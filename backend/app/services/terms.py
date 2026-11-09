from datetime import UTC, datetime
from typing import Literal

DINER_TERMS_VERSION = "1.0"
RESTAURANT_TERMS_VERSION = "1.0"

TermsRole = Literal["diner", "restaurant"]


def acceptance_for(role: TermsRole) -> tuple[str, datetime]:
    version = DINER_TERMS_VERSION if role == "diner" else RESTAURANT_TERMS_VERSION
    return version, datetime.now(UTC)
