from __future__ import annotations

import logging
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from app.api.dependencies import get_container
from app.api.schemas import Token
from app.security.auth import verify_password, create_access_token

"""
app/api/routes/auth.py

此模組實作了系統的身份驗證 (Authentication) 路由。
提供前端應用程式換取 JWT (JSON Web Token) 的端點。
"""

# 建立 FastAPI 路由器，設定標籤以便在 OpenAPI (Swagger UI) 中分類
router = APIRouter(tags=["auth"])

_logger = logging.getLogger(__name__)


@router.post("/auth/token", response_model=Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    container=Depends(get_container),
):
    """
    登入並獲取 JWT 權杖 (Access Token)。
    
    執行流程：
    1. 接收來自客戶端的 OAuth2 表單資料 (包含 username 與 password)。
    2. 從資料庫中查詢該使用者。
    3. 驗證密碼雜湊值是否相符。
    4. 驗證成功後，根據系統配置生成具有過期時間的 JWT 權杖。
    """
    # 透過 UserService 查詢使用者
    user = await container.users.get_user_by_username(form_data.username)
    
    # 驗證使用者是否存在且密碼正確
    if not user or not verify_password(form_data.password, user.hashed_password):
        # 驗證失敗時拋出 401 Unauthorized 錯誤
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 從配置中讀取權杖過期時間
    access_token_expires = timedelta(
        minutes=container.config.access_token_expire_minutes
    )
    
    # 簽發 JWT，將使用者名稱存入 subject (sub) 欄位
    access_token = create_access_token(
        data={"sub": user.username},
        secret_key=container.config.jwt_secret,
        algorithm=container.config.jwt_algorithm,
        expires_delta=access_token_expires,
    )

    # 回傳標準的 OAuth2 Token 回應格式
    return {"access_token": access_token, "token_type": "bearer"}
