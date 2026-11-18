from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth import service
from app.auth.schemas import (
    LoginRequest,
    LoginResponse,
    LogoutRequest,
    LogoutResponse,
    RefreshRequest,
    RegisterRequest,
)
from app.db.deps import get_db

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register")
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    service.register_user(
        db,
        name=request.name,
        email=request.email,
        password=request.password,
        confirm_password=request.confirm_password,
    )
    return {"message": "User registered successfully"}


@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    return service.login_user(db, email=request.email, password=request.password)


@router.post("/refresh", response_model=LoginResponse)
def refresh(request: RefreshRequest, db: Session = Depends(get_db)):
    return service.refresh_user(db, refresh_token=request.refresh_token)


@router.post("/logout", response_model=LogoutResponse)
def logout(request: LogoutRequest, db: Session = Depends(get_db)):
    service.logout_user(db, refresh_token=request.refresh_token)
    return LogoutResponse(message="Logged out successfully")