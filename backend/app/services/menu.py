from uuid import UUID

from sqlalchemy import case, select
from sqlalchemy.orm import Session

from app.models.dish import Dish

CATEGORY_ORDER = ("entrada", "plato_principal", "postre", "bebida")


def menu_dishes(session: Session, restaurant_id: UUID) -> list[Dish]:
    category_order = case(
        {category: index for index, category in enumerate(CATEGORY_ORDER)},
        value=Dish.categoria,
        else_=len(CATEGORY_ORDER),
    )
    return list(
        session.scalars(
            select(Dish)
            .where(Dish.id_restaurante == restaurant_id, Dish.disponible.is_(True))
            .order_by(category_order, Dish.nombre)
        )
    )
