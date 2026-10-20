import re

CUIT_PATTERN = re.compile(r"^[0-9]{11}$")
CUIT_WEIGHTS = (5, 4, 3, 2, 7, 6, 5, 4, 3, 2)
PHONE_PATTERN = re.compile(r"^\+?[0-9 ()\-]{6,30}$")


def normalize_cuit(cuit: str) -> str:
    """Accepts the usual written forms (20-30500010912 or 20 30500010912) and keeps the digits."""
    return cuit.replace("-", "").replace(" ", "")


def is_valid_cuit(cuit: str) -> bool:
    """Checks the 11 digits and the verifier digit (módulo 11), as AFIP computes it."""
    if not CUIT_PATTERN.fullmatch(cuit):
        return False
    total = sum(int(digit) * weight for digit, weight in zip(cuit[:10], CUIT_WEIGHTS, strict=True))
    verifier = 11 - total % 11
    if verifier == 11:
        verifier = 0
    if verifier == 10:
        # AFIP never assigns a CUIT whose verifier would be 10.
        return False
    return verifier == int(cuit[10])


def is_valid_phone(phone: str) -> bool:
    """Digits with optional +, spaces, parentheses and dashes; 6 to 15 digits."""
    if not PHONE_PATTERN.fullmatch(phone):
        return False
    return 6 <= sum(character.isdigit() for character in phone) <= 15