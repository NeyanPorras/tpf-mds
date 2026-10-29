"""Excepción base y lista de errores del proyecto."""
from typing import Any

from fastapi.responses import JSONResponse


class ApiError(Exception):
    """Error esperado de la API.

    STATUS_ERROR define los pares HTTP <-> code del contrato de la API
    (docs/contrato-api.md). Toda respuesta de error sale por acá, así el
    frontend rec SIEMPRE la misma forma.
    """

    STATUS_ERROR: dict[int, str] = {
        400: "BAD_REQUEST",
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        409: "CONFLICT",
        422: "VALIDATION_ERROR",
        500: "INTERNAL_ERROR",
        503: "SERVICE_UNAVAILABLE",
    }

    def __init__(
        self,
        estado_http: int = 400,
        mensaje: str = "Petición inválida.",
        detalle: Any = None,
        code: str | None = None,
    ) -> None:
        self.estado_http = estado_http
        self.mensaje = mensaje
        self.detalle = detalle
        self.code = code or self.STATUS_ERROR.get(estado_http, "INTERNAL_ERROR")
        super().__init__(self.mensaje)

    def como_json(self) -> JSONResponse:
        cuerpo = {
            "error": {
                "code": self.code,
                "message": self.mensaje,
                "details": self.detalle,
            }
        }
        return JSONResponse(
            status_code=self.estado_http,
            content=cuerpo,
        )
