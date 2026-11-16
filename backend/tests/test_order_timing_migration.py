"""Backfill/rollback in an isolated clone of legacy tables inside servido_test."""

from datetime import timedelta
from uuid import uuid4

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url

from app.config import settings
from app.db import engine
from tests.reservations import NOW


def test_us43_edge_migration_preserves_legacy_arrival_and_no_fictitious_method():
    assert engine.url.database == "servido_test"
    schema = "spec020_" + uuid4().hex
    original_url = settings.database_url
    url = make_url(original_url).update_query_dict({"options": f"-csearch_path={schema},public"})
    isolated = create_engine(url)
    with engine.begin() as connection:
        assert connection.scalar(text("SELECT current_database()")) == "servido_test"
        assert 170000 <= int(connection.scalar(text("SHOW server_version_num"))) < 180000
        connection.exec_driver_sql(f'CREATE SCHEMA "{schema}"')
        # LIKE copies field defaults/checks/indexes but not public foreign keys or triggers.
        for table in ("reservations", "pedidos", "carts"):
            connection.exec_driver_sql(
                f'CREATE TABLE "{schema}".{table} (LIKE public.{table} INCLUDING ALL)'
            )
        for table in ("pedidos", "carts"):
            for column in ("arrival_delay", "payment_method"):
                connection.exec_driver_sql(f'ALTER TABLE "{schema}".{table} DROP COLUMN {column}')
        connection.exec_driver_sql(f'ALTER TABLE "{schema}".pedidos DROP COLUMN payment_status')
        connection.exec_driver_sql(
            f'CREATE TABLE "{schema}".alembic_version (version_num varchar(32) PRIMARY KEY)'
        )
        connection.exec_driver_sql(f"INSERT INTO {schema}.alembic_version VALUES ('5061ebdc5acd')")
    try:
        settings.database_url = url.render_as_string(hide_password=False)
        config = Config("alembic.ini")
        reservation_id, restaurant_id, diner_id = uuid4(), uuid4(), uuid4()
        with isolated.begin() as connection:
            connection.execute(
                text(
                    "INSERT INTO reservations "
                    "(id, restaurant_id, diner_id, table_capacity, table_number, seating_area, "
                    "party_size, starts_at, ends_at, request_id) "
                    "VALUES (:id, :restaurant, :diner, 4, 1, 'terrace', 2, :start, :end, :request)"
                ),
                {
                    "id": reservation_id,
                    "restaurant": restaurant_id,
                    "diner": diner_id,
                    "start": NOW,
                    "end": NOW + timedelta(minutes=90),
                    "request": uuid4(),
                },
            )
            connection.execute(
                text(
                    "INSERT INTO pedidos "
                    "(id, reservation_id, restaurant_id, status, prep_start_time) "
                    "VALUES (:id, :reservation, :restaurant, 'confirmed', :arrival)"
                ),
                {
                    "id": uuid4(),
                    "reservation": reservation_id,
                    "restaurant": restaurant_id,
                    "arrival": NOW,
                },
            )
            connection.execute(
                text(
                    "INSERT INTO carts (id, reservation_id, updated_at) "
                    "VALUES (:id, :reservation, :now)"
                ),
                {"id": uuid4(), "reservation": reservation_id, "now": NOW},
            )
        for _ in range(2):
            command.upgrade(config, "459c8cb1f9cf")
            with isolated.connect() as connection:
                row = connection.execute(
                    text(
                        "SELECT arrival_delay, payment_method, payment_status "
                        "FROM pedidos WHERE reservation_id = :id"
                    ),
                    {"id": reservation_id},
                ).one()
                assert tuple(row) == (timedelta(), None, "pending")
                cart = connection.execute(
                    text(
                        "SELECT arrival_delay, payment_method FROM carts WHERE reservation_id = :id"
                    ),
                    {"id": reservation_id},
                ).one()
                assert tuple(cart) == (timedelta(), None)
            command.downgrade(config, "5061ebdc5acd")
    finally:
        settings.database_url = original_url
        isolated.dispose()
        with engine.begin() as connection:
            connection.exec_driver_sql(f'DROP SCHEMA "{schema}" CASCADE')
