from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Request, Response, UploadFile
from sqlalchemy.orm import Session

from . import service
from .cookies import REFRESH_COOKIE, clear_refresh_cookie, set_refresh_cookie
from .dependencies import get_current_user
from .schemas import (
    LoginRequest,
    LoginResponse,
    LogoutResponse,
    MeUpdate,
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
    login_response, refresh_token = service.register_user(
        db,
        name=body.name,
        email=body.email,
        password=body.password,
        confirm_password=body.confirm_password,
    )
    set_refresh_cookie(response, refresh_token)
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
    login_response, refresh_token = service.login_user(db, email=body.email, password=body.password)
    set_refresh_cookie(response, refresh_token)
    return login_response


@router.post("/refresh", response_model=LoginResponse)
@limiter.limit("30/minute")
def refresh(
    request: Request, response: Response, db: Session = Depends(get_db)
):
    refresh_token = request.cookies.get(REFRESH_COOKIE)
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    login_response, next_refresh_token = service.refresh_user(db, refresh_token=refresh_token)
    set_refresh_cookie(response, next_refresh_token)
    return login_response


@router.post("/logout", response_model=LogoutResponse)
@limiter.limit("30/minute")
def logout(
    request: Request, response: Response, db: Session = Depends(get_db)
):
    refresh_token = request.cookies.get(REFRESH_COOKIE)
    if refresh_token:
        try:
            service.logout_user(db, refresh_token=refresh_token)
        except HTTPException:
            pass
    clear_refresh_cookie(response)
    return LogoutResponse(message="Logged out successfully")


@router.get("/me", response_model=UserOut)
@limiter.limit("60/minute")
def me(
    request: Request, response: Response, current_user: User = Depends(get_current_user)
):
    return service.get_me(current_user)


@router.patch("/me", response_model=UserOut)
@limiter.limit("30/minute")
def update_me(
    request: Request,
    response: Response,
    body: MeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.update_me(db, user=current_user, data=body)


@router.post("/me/photo", response_model=UserOut)
@limiter.limit("10/minute")
def upload_me_photo(
    request: Request,
    response: Response,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.upload_user_photo(db, user=current_user, upload=file)