from datetime import date, time
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models.table_inventory import TableInventoryGroup
from app.services import reservation_conflicts


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
    groups: list[dict[str, int | bool]],
) -> list[TableInventoryGroup]:
    capacities = [int(group["capacity"]) for group in groups]
    if len(capacities) != len(set(capacities)):
        raise ValueError("No puede haber dos grupos con la misma capacidad.")

    existing = {
        group.capacity: group
        for group in session.scalars(
            select(TableInventoryGroup)
            .where(TableInventoryGroup.restaurant_id == restaurant_id)
            .with_for_update()
        )
    }
    incoming_capacities = {int(group["capacity"]) for group in groups}
    removed = set(existing) - incoming_capacities
    changed = set(incoming_capacities) | removed
    for capacity in changed:
        old_group = existing.get(capacity)
        old_quantity = old_group.quantity if old_group is not None and old_group.available else 0
        new_group = next((group for group in groups if int(group["capacity"]) == capacity), None)
        new_quantity = (
            int(new_group["quantity"])
            if new_group is not None and bool(new_group["available"])
            else 0
        )
        delta = new_quantity - old_quantity
        if delta >= 0:
            continue
        result = reservation_conflicts.check_reservation_conflict(
            reservation_conflicts.ReservationConflictRequest(
                restaurant_id=restaurant_id,
                group_capacity=capacity,
                date=date.today(),
                start_time=time.min,
                end_time=time.max,
                quantity_delta=delta,
            )
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
