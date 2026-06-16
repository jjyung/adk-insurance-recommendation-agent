from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from passlib.context import CryptContext

# 設定密碼雜湊密鑰上下文 (使用 bcrypt)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    驗證明文密碼是否與雜湊密碼相符。
    """
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """
    將明文密碼轉換為雜湊字串。
    """
    return pwd_context.hash(password)


def create_access_token(
    data: dict[str, Any],
    secret_key: str,
    algorithm: str,
    expires_delta: timedelta | None = None,
) -> str:
    """
    建立 JWT 存取權杖。
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, secret_key, algorithm=algorithm)
    return encoded_jwt


def decode_access_token(
    token: str, secret_key: str, algorithm: str
) -> dict[str, Any] | None:
    """
    解碼並驗證 JWT 權杖。
    如果驗證失敗則回傳 None。
    """
    try:
        payload = jwt.decode(token, secret_key, algorithms=[algorithm])
        return payload
    except (jwt.PyJWTError, ValueError):
        return None
