"""Demo data for local mode (`make up-local`): a bookable restaurant with a menu and a verified
diner, so the team can try reservations and orders on localhost. It only adds what is missing,
so it can run on every start. Never run it against production."""

from datetime import UTC, datetime, time
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.db import SessionLocal
from app.models.diner import Diner
from app.models.dish import Dish
from app.models.opening_shift import OpeningShift
from app.models.restaurant import Restaurant
from app.models.table_inventory import TableInventoryGroup
from app.services.auth import hash_password

PASSWORD = "Servido2026"
RESTAURANT_EMAIL = "restaurante@servido.local"
RESTAURANT_CUIT = "30700000008"
DINER_EMAIL = "comensal@servido.local"

# (name, category, price, preparation minutes, dietary restrictions)
DISHES = (
    ("Provoleta", "entrada", "7500.00", 10, ["sin_tacc", "vegetariano"]),
    ("Empanada de carne", "entrada", "2800.50", 15, []),
    ("Bife de chorizo", "plato_principal", "18500.00", 25, ["sin_tacc"]),
    ("Ravioles de ricota", "plato_principal", "12900.00", 20, ["vegetariano"]),
    ("Flan con dulce de leche", "postre", "6000.00", None, ["vegetariano"]),
    ("Agua con gas", "bebida", "2500.00", None, ["sin_tacc", "vegano"]),
)


def seed(session: Session) -> None:
    now = datetime.now(UTC)
    restaurant = session.scalar(
        select(Restaurant).where(
            (Restaurant.email == RESTAURANT_EMAIL) | (Restaurant.cuit == RESTAURANT_CUIT)
        )
    )
    if restaurant is None:
        restaurant = Restaurant(
            nombre="Parrilla Local",
            cuit=RESTAURANT_CUIT,
            email=RESTAURANT_EMAIL,
            telefono="1155550000",
            password_hash=hash_password(PASSWORD),
            direccion="Gurruchaga 1500",
            barrio="Palermo",
            tipo_comida="Parrilla",
            descripcion="Restaurante de prueba para el modo local.",
            rango_precio="$$",
            latitud=Decimal("-34.588500"),
            longitud=Decimal("-58.426500"),
        )
        session.add(restaurant)
        session.flush()
        # Open all day, every day, so a reservation can be tried at any hour.
        session.add_all(
            OpeningShift(
                restaurant_id=restaurant.id_restaurante,
                day_of_week=day,
                start_time=time(8),
                end_time=time(23, 30),
            )
            for day in range(1, 8)
        )
        session.add_all(
            [
                TableInventoryGroup(
                    restaurant_id=restaurant.id_restaurante,
                    capacity=2,
                    quantity=4,
                    seating_area="indoor",
                ),
                TableInventoryGroup(
                    restaurant_id=restaurant.id_restaurante,
                    capacity=4,
                    quantity=3,
                    seating_area="terrace",
                ),
            ]
        )
    existing = set(
        session.scalars(select(Dish.nombre).where(Dish.id_restaurante == restaurant.id_restaurante))
    )
    session.add_all(
        Dish(
            id_restaurante=restaurant.id_restaurante,
            nombre=name,
            categoria=category,
            precio=Decimal(price),
            tiempo_preparacion_minutos=minutes,
            restricciones_alimenticias=restrictions,
            creado_en=now,
        )
        for name, category, price, minutes, restrictions in DISHES
        if name not in existing
    )
    if session.scalar(select(Diner).where(Diner.email == DINER_EMAIL)) is None:
        session.add(
            Diner(
                nombre="Comensal Local",
                email=DINER_EMAIL,
                password_hash=hash_password(PASSWORD),
                email_verified_at=now,
            )
        )
    session.flush()


def main() -> None:
    if not settings.auto_verify_emails:
        raise SystemExit("The local seed only runs in local mode (AUTO_VERIFY_EMAILS=true).")
    with SessionLocal() as session:
        seed(session)
        session.commit()
    print(f"Local mode: restaurant {RESTAURANT_EMAIL} and diner {DINER_EMAIL}, password {PASSWORD}")


if __name__ == "__main__":
    main()
