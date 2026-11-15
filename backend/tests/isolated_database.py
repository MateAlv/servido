"""Tests run on their own database, created again on every run.

The development database (`make up`) can hold a migration from another branch. If the tests used
it, switching branches would leave it at a revision this branch doesn't know, and every test would
fail. This plugin loads before any app module creates the engine (`-p` in pyproject.toml).
"""

from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url

from app.config import settings

_development = make_url(settings.database_url)
TEST_DATABASE = (
    _development.database
    if (_development.database or "").endswith("_test")
    else f"{_development.database}_test"
)
settings.database_url = _development.set(database=TEST_DATABASE).render_as_string(
    hide_password=False
)


def recreate_test_database() -> None:
    server = create_engine(_development.set(database="postgres"), isolation_level="AUTOCOMMIT")
    with server.connect() as connection:
        connection.execute(text(f'DROP DATABASE IF EXISTS "{TEST_DATABASE}" WITH (FORCE)'))
        connection.execute(text(f'CREATE DATABASE "{TEST_DATABASE}"'))
    server.dispose()
