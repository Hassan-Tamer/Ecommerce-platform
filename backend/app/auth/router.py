from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy.orm import Session

from app.auth import service
from app.auth.dependencies import get_current_user
from app.auth.schemas import (
    LoginRequest,
    LoginResponse,
    LogoutRequest,
    LogoutResponse,
    RefreshRequest,
    RegisterRequest,
    UserOut,
)
from app.db.deps import get_db
from app.db.models import User
from app.notifications.emails import send_register_hello_background

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=LoginResponse)
def register(
    request: RegisterRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    response = service.register_user(
        db,
        name=request.name,
        email=request.email,
        password=request.password,
        confirm_password=request.confirm_password,
    )
    background_tasks.add_task(
        send_register_hello_background,
        to=response.user.email,
        name=response.user.name,
    )
    return response


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


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return service.get_me(current_user)