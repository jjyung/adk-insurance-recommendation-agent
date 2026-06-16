from datetime import timedelta, timezone, datetime
import jwt
from app.security.auth import (
    verify_password,
    get_password_hash,
    create_access_token,
    decode_access_token,
)


def test_verify_password_correct():
    plain_password = "secret_password"
    hashed_password = get_password_hash(plain_password)
    assert verify_password(plain_password, hashed_password) is True


def test_verify_password_incorrect():
    plain_password = "secret_password"
    hashed_password = get_password_hash(plain_password)
    assert verify_password("wrong_password", hashed_password) is False


def test_get_password_hash():
    password = "test_password"
    hashed = get_password_hash(password)
    assert hashed != password
    assert len(hashed) > 0


def test_create_access_token_default_expiry():
    data = {"sub": "testuser"}
    secret = "secret"
    algo = "HS256"
    token = create_access_token(data, secret, algo)

    payload = jwt.decode(token, secret, algorithms=[algo])
    assert payload["sub"] == "testuser"
    assert "exp" in payload

    # Default is 15 minutes
    exp_time = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
    now = datetime.now(timezone.utc)
    diff = exp_time - now
    assert 14 <= diff.total_seconds() / 60 <= 16


def test_create_access_token_custom_expiry():
    data = {"sub": "testuser"}
    secret = "secret"
    algo = "HS256"
    expires = timedelta(minutes=30)
    token = create_access_token(data, secret, algo, expires_delta=expires)

    payload = jwt.decode(token, secret, algorithms=[algo])
    exp_time = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
    now = datetime.now(timezone.utc)
    diff = exp_time - now
    assert 29 <= diff.total_seconds() / 60 <= 31


def test_decode_access_token_success():
    data = {"sub": "testuser"}
    secret = "secret"
    algo = "HS256"
    token = create_access_token(data, secret, algo)

    decoded = decode_access_token(token, secret, algo)
    assert decoded is not None
    assert decoded["sub"] == "testuser"


def test_decode_access_token_failure():
    secret = "secret"
    algo = "HS256"
    invalid_token = "not.a.token"

    decoded = decode_access_token(invalid_token, secret, algo)
    assert decoded is None
