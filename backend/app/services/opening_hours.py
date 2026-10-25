from collections import defaultdict
from datetime import time


def validate_shifts(shifts: list[tuple[int, time, time, bool]]) -> None:
    by_day: dict[int, list[tuple[time, time]]] = defaultdict(list)
    for day, start, end, active in shifts:
        if not 1 <= day <= 7:
            raise ValueError("El día de la semana no es válido.")
        if end <= start:
            raise ValueError("La hora de fin debe ser posterior a la de inicio.")
        if active:
            by_day[day].append((start, end))

    for day_intervals in by_day.values():
        ordered = sorted(day_intervals)
        if any(
            next_start < current_end
            for (_, current_end), (next_start, _) in zip(ordered, ordered[1:], strict=False)
        ):
            raise ValueError("Los turnos del mismo día no pueden superponerse.")
