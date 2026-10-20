from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.openapi.utils import get_openapi
from fastapi.responses import JSONResponse

from app.api import api_router

app = FastAPI(title="Servido! API", docs_url="/api/docs", openapi_url="/api/openapi.json")
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


@app.exception_handler(RequestValidationError)
async def validation_error_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    # The specs require 400 Bad Request for invalid input, not FastAPI's default 422.
    return JSONResponse(status_code=400, content={"detail": jsonable_encoder(exc.errors())})
