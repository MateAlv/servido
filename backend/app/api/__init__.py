from fastapi import APIRouter

from app.api import account, auth, dish, health, restaurant

api_router = APIRouter(prefix="/api")
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(restaurant.router)
api_router.include_router(dish.router)
api_router.include_router(account.router)
