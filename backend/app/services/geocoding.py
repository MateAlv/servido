import json
import time
from decimal import Decimal, InvalidOperation
from urllib.parse import urlencode
from urllib.request import Request, urlopen


class GeocodingError(Exception):
    """A user-visible geocoding failure."""


_last_request_at = 0.0


def geocode_address(address: str) -> dict[str, Decimal | str]:
    global _last_request_at
    wait = 1.0 - (time.monotonic() - _last_request_at)
    if wait > 0:
        time.sleep(wait)

    query = urlencode({"q": address, "format": "jsonv2", "limit": 1, "accept-language": "es"})
    request = Request(
        f"https://nominatim.openstreetmap.org/search?{query}",
        headers={"User-Agent": "Servido/1.0 (restaurant configuration)"},
    )
    _last_request_at = time.monotonic()
    try:
        with urlopen(request, timeout=10) as response:
            result = json.load(response)
    except OSError as error:
        raise GeocodingError("No pudimos consultar la dirección. Intentá de nuevo.") from error

    if not result or not isinstance(result[0], dict):
        raise GeocodingError("No pudimos ubicar esa dirección.")
    item = result[0]
    try:
        latitude = Decimal(str(item["lat"]))
        longitude = Decimal(str(item["lon"]))
        if not -90 <= latitude <= 90 or not -180 <= longitude <= 180:
            raise ValueError
    except (KeyError, InvalidOperation, ValueError) as error:
        raise GeocodingError("La ubicación recibida no es válida.") from error
    return {
        "display_name": str(item.get("display_name", address)),
        "latitude": latitude,
        "longitude": longitude,
    }
