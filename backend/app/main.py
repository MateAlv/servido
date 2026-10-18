from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.api import api_router

app = FastAPI(title="Servido! API", docs_url="/api/docs", openapi_url="/api/openapi.json")
app.include_router(api_router)


@app.exception_handler(RequestValidationError)
async def validation_error_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    # The specs require 400 Bad Request for invalid input, not FastAPI's default 422.
    return JSONResponse(status_code=400, content={"detail": jsonable_encoder(exc.errors())})
