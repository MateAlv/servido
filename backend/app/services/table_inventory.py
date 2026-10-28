from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models.table_inventory import TableInventoryGroup
from app.services import availability, reservation_conflicts


def eligible_quantity(session: Session, restaurant_id: UUID, party_size: int) -> int:
    groups = session.scalars(
        select(TableInventoryGroup).where(
            TableInventoryGroup.restaurant_id == restaurant_id,
            TableInventoryGroup.available.is_(True),
            TableInventoryGroup.capacity >= party_size,
        )
    )
    return sum(group.quantity for group in groups)


def replace_inventory(
    session: Session,
    restaurant_id: UUID,
    groups: list[dict[str, int | bool | str]],
) -> list[TableInventoryGroup]:
    # A group is identified by its capacity and seating area (spec 004, FR-009).
    keys = [(int(group["capacity"]), str(group["seating_area"])) for group in groups]
    if len(keys) != len(set(keys)):
        raise ValueError(
            "No puede haber dos grupos con la misma capacidad y el mismo tipo de mesa."
        )

    existing = {
        (group.capacity, group.seating_area): group
        for group in session.scalars(
            select(TableInventoryGroup)
            .where(TableInventoryGroup.restaurant_id == restaurant_id)
            .with_for_update()
        )
    }
    for key in set(existing) | set(keys):
        old_group = existing.get(key)
        old_quantity = old_group.quantity if old_group is not None and old_group.available else 0
        new_group = next(
            (group for group, group_key in zip(groups, keys, strict=True) if group_key == key), None
        )
        new_quantity = (
            int(new_group["quantity"])
            if new_group is not None and bool(new_group["available"])
            else 0
        )
        if new_quantity >= old_quantity:
            continue
        result = reservation_conflicts.check_reservation_conflict(
            session,
            restaurant_id,
            capacity=key[0],
            seating_area=key[1],
            new_quantity=new_quantity,
            now=availability.current_time(),
        )
        if result.has_conflict:
            raise ReservationConflictError(result)

    session.execute(
        delete(TableInventoryGroup).where(TableInventoryGroup.restaurant_id == restaurant_id)
    )
    saved: list[TableInventoryGroup] = []
    for payload in groups:
        group = TableInventoryGroup(
            restaurant_id=restaurant_id,
            capacity=int(payload["capacity"]),
            seating_area=str(payload["seating_area"]),
            quantity=int(payload["quantity"]),
            available=bool(payload["available"]),
        )
        session.add(group)
        saved.append(group)
    session.flush()
    return saved


class ReservationConflictError(Exception):
    def __init__(self, result: reservation_conflicts.ReservationConflictResult) -> None:
        self.result = result
