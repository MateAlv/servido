"""Create deterministic development accounts and restaurant data."""

from datetime import UTC, datetime, time
from decimal import Decimal

from sqlalchemy import select

from app.db import SessionLocal
from app.models.diner import Diner
from app.models.dish import Dish
from app.models.opening_shift import OpeningShift
from app.models.restaurant import Restaurant
from app.models.table_inventory import TableInventoryGroup
from app.services.auth import hash_password

RESTAURANT_EMAIL = "demo@servido.local"
RESTAURANT_PASSWORD = "DemoRestaurante123"
RESTAURANT_CUIT = "30712345678"
DINER_EMAIL = "cliente@servido.local"
DINER_PASSWORD = "ClienteDemo123"


def seed() -> None:
    with SessionLocal.begin() as session:
        restaurant = session.scalar(select(Restaurant).where(Restaurant.email == RESTAURANT_EMAIL))
        if restaurant is None:
            restaurant = Restaurant(
                nombre="Restaurante Demo",
                cuit=RESTAURANT_CUIT,
                email=RESTAURANT_EMAIL,
                telefono="+54 11 5555-0101",
                password_hash=hash_password(RESTAURANT_PASSWORD),
            )
            session.add(restaurant)
            session.flush()

        restaurant.nombre = "Restaurante Demo"
        restaurant.telefono = "+54 11 5555-0101"
        restaurant.direccion = "Av. Corrientes 1234"
        restaurant.barrio = "Almagro"
        restaurant.tipo_comida = "Italiana"
        restaurant.descripcion = "Un restaurante de prueba para Servido."
        restaurant.rango_precio = "$$"
        restaurant.latitud = Decimal("-34.603722")
        restaurant.longitud = Decimal("-58.411561")

        diner = session.scalar(select(Diner).where(Diner.email == DINER_EMAIL))
        if diner is None:
            session.add(
                Diner(
                    nombre="Cliente Demo",
                    email=DINER_EMAIL,
                    password_hash=hash_password(DINER_PASSWORD),
                    email_verified_at=datetime.now(UTC),
                )
            )

        for day_of_week in range(1, 8):
            shift_exists = session.scalar(
                select(OpeningShift.id).where(
                    OpeningShift.restaurant_id == restaurant.id_restaurante,
                    OpeningShift.day_of_week == day_of_week,
                    OpeningShift.start_time == time(12, 0),
                    OpeningShift.end_time == time(23, 0),
                )
            )
            if shift_exists is None:
                session.add(
                    OpeningShift(
                        restaurant_id=restaurant.id_restaurante,
                        day_of_week=day_of_week,
                        start_time=time(12, 0),
                        end_time=time(23, 0),
                    )
                )

        for capacity, quantity, seating_area in (
            (2, 4, "indoor"),
            (4, 4, "indoor"),
            (4, 2, "outdoor"),
        ):
            table_exists = session.scalar(
                select(TableInventoryGroup.id).where(
                    TableInventoryGroup.restaurant_id == restaurant.id_restaurante,
                    TableInventoryGroup.capacity == capacity,
                    TableInventoryGroup.seating_area == seating_area,
                )
            )
            if table_exists is None:
                session.add(
                    TableInventoryGroup(
                        restaurant_id=restaurant.id_restaurante,
                        capacity=capacity,
                        quantity=quantity,
                        seating_area=seating_area,
                    )
                )

        dishes = (
            ("Empanada de carne", "entrada", Decimal("3200.00"), 15, True, None),
            ("Ravioles de ricota", "plato_principal", Decimal("12500.00"), 20, True, None),
            ("Tiramisú", "postre", Decimal("6500.00"), 10, True, "/servido-logo.png"),
            ("Limonada", "bebida", Decimal("2800.00"), 5, True, None),
            ("Plato agotado", "entrada", Decimal("4000.00"), 15, False, None),
        )
        for name, category, price, prep_time, available, photo_url in dishes:
            dish = session.scalar(
                select(Dish).where(
                    Dish.id_restaurante == restaurant.id_restaurante,
                    Dish.nombre == name,
                )
            )
            if dish is None:
                session.add(
                    Dish(
                        id_restaurante=restaurant.id_restaurante,
                        nombre=name,
                        categoria=category,
                        precio=price,
                        foto_url=photo_url,
                        disponible=available,
                        restricciones_alimenticias=[],
                        tiempo_preparacion_minutos=prep_time,
                        creado_en=datetime.now(UTC),
                    )
                )
            else:
                dish.categoria = category
                dish.precio = price
                dish.foto_url = photo_url
                dish.disponible = available

    print("Seed listo.")
    print(f"Restaurante: {RESTAURANT_EMAIL} / {RESTAURANT_PASSWORD}")
    print(f"Cliente: {DINER_EMAIL} / {DINER_PASSWORD}")


if __name__ == "__main__":
    seed()
