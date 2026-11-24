from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.announcements import admin_router as announcements_admin_router
from app.announcements import router as announcements_router
from app.auth import router as auth_router
from app.products import admin_router as products_admin_router
from app.products import router as products_router
from app.ratelimit import limiter
from app.cart import router as cart_router
from app.coupons import admin_router as coupons_admin_router
from app.coupons import router as coupons_router
from app.wishlist import router as wishlist_router


def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    response = JSONResponse({"detail": "Too many requests"}, status_code=429)
    return request.app.state.limiter._inject_headers(
        response, request.state.view_rate_limit
    )


app = FastAPI(title="E-commerce API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, tags=["auth"])
app.include_router(products_router)
app.include_router(products_admin_router)
app.include_router(announcements_router)
app.include_router(announcements_admin_router)
app.include_router(wishlist_router)
app.include_router(cart_router)
app.include_router(coupons_router)
app.include_router(coupons_admin_router)

@app.get("/health")
def health():
    return {"status": "healthy"}
