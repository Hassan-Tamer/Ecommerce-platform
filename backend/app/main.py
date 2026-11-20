from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.auth.router import router as auth_router
from app.products.router import router as products_router
from app.ratelimit import limiter


def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    response = JSONResponse({"detail": "Too many requests"}, status_code=429)
    return request.app.state.limiter._inject_headers(
        response, request.state.view_rate_limit
    )


app = FastAPI(title="E-commerce API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.include_router(auth_router, tags=["auth"])
app.include_router(products_router)

@app.get("/health")
def health():
    return {"status": "healthy"}
