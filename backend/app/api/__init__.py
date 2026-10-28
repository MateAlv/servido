from fastapi import APIRouter

from app.api import (
    account,
    auth,
    dish,
    email_verification,
    health,
    public_restaurant,
    reservation,
    restaurant,
)

api_router = APIRouter(prefix="/api")
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(restaurant.router)
api_router.include_router(dish.router)
api_router.include_router(account.router)
api_router.include_router(email_verification.router)
api_router.include_router(reservation.router)
api_router.include_router(public_restaurant.router)
