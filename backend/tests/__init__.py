"""Test database isolation, configured before importing the application engine."""

import os

from sqlalchemy.engine import make_url

os.environ.setdefault(
    "DATABASE_URL", "postgresql+psycopg://servido:servido@localhost:55432/servido_test"
)
if make_url(os.environ["DATABASE_URL"]).database != "servido_test":
    raise RuntimeError("Tests require DATABASE_URL pointing to servido_test.")
