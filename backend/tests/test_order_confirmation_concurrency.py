"""Real connections prove reservation serialization; fixtures live only in servido_test."""

from concurrent.futures import ThreadPoolExecutor
from datetime import time, timedelta
from threading import Barrier, Event
from uuid import uuid4

import pytest
from sqlalchemy import delete, or_, select
from sqlalchemy.orm import Session

from app.db import engine
from app.models import Base, Cart, Diner, Order, OrderConfirmation
from app.schemas.diner_order import ConfirmationRequest
from app.services import orders
from tests.reservations import (
    NOW,
    TOMORROW,
    add_bookable_restaurant,
    add_dish,
    add_reservation,
    item_of,
)


@pytest.fixture
def committed_order():
    assert engine.url.database == "servido_test"
    with Session(engine) as session:
        restaurant = add_bookable_restaurant(
            session, cuit=str(30000000000 + uuid4().int % 999999999)
        )
        diner = Diner(
            nombre="Concurrency",
            email=f"{uuid4()}@example.com",
            password_hash="unused",
            email_verified_at=NOW,
        )
        session.add(diner)
        session.flush()
        reservation = add_reservation(
            session, restaurant, diner.id_comensal, TOMORROW, time(21), 4, "terrace"
        )
        dish = add_dish(session, restaurant, "Concurrent dish", "10.00", 10)
        body = {
            "items": [item_of(dish)],
            "arrival_at": reservation.starts_at,
            "payment_method": "cash",
            "operation_id": uuid4(),
        }
        keys = {
            "restaurantes": [restaurant.id_restaurante],
            "comensales": [diner.id_comensal],
            "reservations": [reservation.id],
        }
        reservation_id, diner_id = reservation.id, diner.id_comensal
        session.commit()
    try:
        yield reservation_id, diner_id, body
    finally:
        # Delete only this fixture's rows, in foreign-key order; never truncate the shared DB.
        with Session(engine) as session:
            keys["pedidos"] = list(
                session.scalars(select(Order.id).where(Order.reservation_id == reservation_id))
            )
            keys["carts"] = list(
                session.scalars(select(Cart.id).where(Cart.reservation_id == reservation_id))
            )
            for table in reversed(Base.metadata.sorted_tables):
                conditions = []
                if table.name in keys and len(table.primary_key.columns) == 1:
                    conditions.append(next(iter(table.primary_key.columns)).in_(keys[table.name]))
                for column in table.columns:
                    for fk in column.foreign_keys:
                        if fk.column.table.name in keys:
                            conditions.append(column.in_(keys[fk.column.table.name]))
                if conditions:
                    session.execute(delete(table).where(or_(*conditions)))
            session.commit()


def apply(reservation_id, diner_id, body):
    with Session(engine) as session:
        result = orders.confirm_operation(
            session, diner_id, reservation_id, ConfirmationRequest(**body)
        )
        session.commit()
        return result[1]


def test_us43_edge_simultaneous_duplicate_operation(committed_order):
    reservation_id, diner_id, body = committed_order
    barrier = Barrier(2)

    def run():
        barrier.wait(timeout=10)
        return apply(reservation_id, diner_id, body)

    with ThreadPoolExecutor(max_workers=2) as pool:
        attempts = [pool.submit(run) for _ in range(2)]
        assert sorted(f.result(timeout=20) for f in attempts) == [False, True]
    with Session(engine) as session:
        assert (
            session.query(OrderConfirmation).filter_by(reservation_id=reservation_id).count() == 1
        )
        assert session.query(Order).filter_by(reservation_id=reservation_id).count() == 1


def test_us43_edge_distinct_confirmations_follow_last_accepted_order(committed_order):
    reservation_id, diner_id, body = committed_order
    locked, attempting = Event(), Event()
    later = {
        **body,
        "operation_id": uuid4(),
        "arrival_at": body["arrival_at"] + timedelta(minutes=30),
    }

    def first():
        with Session(engine) as session:
            orders.diner_reservation(session, diner_id, reservation_id, lock=True)
            locked.set()
            assert attempting.wait(10)
            orders.confirm_operation(session, diner_id, reservation_id, ConfirmationRequest(**body))
            session.commit()

    def second():
        assert locked.wait(10)
        attempting.set()
        return apply(reservation_id, diner_id, later)

    with ThreadPoolExecutor(max_workers=2) as pool:
        a, b = pool.submit(first), pool.submit(second)
        a.result(timeout=20)
        assert b.result(timeout=20) is False
    with Session(engine) as session:
        assert session.query(Order).filter_by(
            reservation_id=reservation_id
        ).one().arrival_delay == timedelta(minutes=30)


def test_us45_edge_payment_write_serialization(committed_order):
    reservation_id, diner_id, body = committed_order
    apply(reservation_id, diner_id, body)
    locked, attempting = Event(), Event()

    def credit():
        with Session(engine) as session:
            orders.diner_reservation(session, diner_id, reservation_id, lock=True)
            order = orders.order_of(session, reservation_id)
            order.payment_status = "paid"
            order.paid_amount = 0
            order.paid_at = order.created_at
            session.flush()
            locked.set()
            assert attempting.wait(10)
            session.commit()

    def preference():
        assert locked.wait(10)
        attempting.set()
        with Session(engine) as session, pytest.raises(orders.OrderConflictError):
            orders.change_payment_method(session, diner_id, reservation_id, "online", NOW)

    with ThreadPoolExecutor(max_workers=2) as pool:
        a, b = pool.submit(credit), pool.submit(preference)
        a.result(timeout=20)
        b.result(timeout=20)
    with Session(engine) as session:
        order = orders.order_of(session, reservation_id)
        assert (order.payment_status, order.payment_method) == ("paid", "cash")
