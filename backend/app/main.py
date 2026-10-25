from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.openapi.utils import get_openapi
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api import api_router

app = FastAPI(title="Servido! API", docs_url="/api/docs", openapi_url="/api/openapi.json")
app.mount("/media", StaticFiles(directory="uploads", check_dir=False), name="media")
app.include_router(api_router)


def custom_openapi() -> dict:
    if app.openapi_schema:
        return app.openapi_schema

    schema = get_openapi(
        title=app.title,
        version="1.0.0",
        routes=app.routes,
    )
    for path_item in schema["paths"].values():
        for operation in path_item.values():
            if not isinstance(operation, dict):
                continue
            default_validation_response = operation.get("responses", {}).pop("422", None)
            if default_validation_response is not None:
                operation["responses"].setdefault("400", default_validation_response)
    app.openapi_schema = schema
    return schema


app.openapi = custom_openapi


VALUE_ERROR_PREFIX = "Value error, "


def _message_for_users(error: dict) -> dict:
    """Pydantic prefixes our ValueError messages with 'Value error, '. The UI shows them as is."""
    message = error.get("msg", "")
    if message.startswith(VALUE_ERROR_PREFIX):
        return {**error, "msg": message.removeprefix(VALUE_ERROR_PREFIX)}
    return error


@app.exception_handler(RequestValidationError)
async def validation_error_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    # The specs require 400 Bad Request for invalid input, not FastAPI's default 422.
    errors = [_message_for_users(error) for error in exc.errors()]
    return JSONResponse(status_code=400, content={"detail": jsonable_encoder(errors)})
