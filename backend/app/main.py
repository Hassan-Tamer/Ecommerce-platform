from fastapi import FastAPI

from app.auth.router import router as auth_router

app = FastAPI(title="E-commerce API")
app.include_router(auth_router, tags=["auth"])