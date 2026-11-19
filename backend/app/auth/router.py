from fastapi import APIRouter, BackgroundTasks, Depends, Request, Response
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
from app.ratelimit import limiter

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=LoginResponse)
@limiter.limit("10/minute")
def register(
    request: Request,
    response: Response,
    body: RegisterRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    login_response = service.register_user(
        db,
        name=body.name,
        email=body.email,
        password=body.password,
        confirm_password=body.confirm_password,
    )
    background_tasks.add_task(
        send_register_hello_background,
        to=login_response.user.email,
        name=login_response.user.name,
    )
    return login_response


@router.post("/login", response_model=LoginResponse)
@limiter.limit("10/minute")
def login(
    request: Request, response: Response, body: LoginRequest, db: Session = Depends(get_db)
):
    return service.login_user(db, email=body.email, password=body.password)


@router.post("/refresh", response_model=LoginResponse)
@limiter.limit("30/minute")
def refresh(
    request: Request, response: Response, body: RefreshRequest, db: Session = Depends(get_db)
):
    return service.refresh_user(db, refresh_token=body.refresh_token)


@router.post("/logout", response_model=LogoutResponse)
@limiter.limit("30/minute")
def logout(
    request: Request, response: Response, body: LogoutRequest, db: Session = Depends(get_db)
):
    service.logout_user(db, refresh_token=body.refresh_token)
    return LogoutResponse(message="Logged out successfully")


@router.get("/me", response_model=UserOut)
@limiter.limit("60/minute")
def me(
    request: Request, response: Response, current_user: User = Depends(get_current_user)
):
    return service.get_me(current_user)