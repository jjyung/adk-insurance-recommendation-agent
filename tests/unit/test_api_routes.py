import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, MagicMock
from app.api.main import create_app
from app.api.dependencies import get_container, get_current_user
from app.api.schemas import UserInDB


@pytest.fixture
def mock_container():
    container = MagicMock()
    container.config.app_name = "app"
    container.config.jwt_secret = "secret"
    container.config.jwt_algorithm = "HS256"
    container.config.access_token_expire_minutes = 30
    container.users = AsyncMock()
    container.sessions = AsyncMock()
    container.audit_logs = AsyncMock()
    container.audit_logs.initialize = AsyncMock()
    return container


@pytest.fixture
def client(mock_container):
    app = create_app(mock_container)

    # Override dependencies
    app.dependency_overrides[get_container] = lambda: mock_container
    app.dependency_overrides[get_current_user] = lambda: UserInDB(
        user_id=1, username="testuser", hashed_password="hashed", is_active=True
    )

    with TestClient(app) as client:
        yield client


def test_login_for_access_token_success(client, mock_container):
    from app.security.auth import get_password_hash

    mock_container.users.get_user_by_username.return_value = UserInDB(
        user_id=1,
        username="testuser",
        hashed_password=get_password_hash("testpass"),
        is_active=True,
    )

    response = client.post(
        "/auth/token", data={"username": "testuser", "password": "testpass"}
    )

    assert response.status_code == 200
    assert "access_token" in response.json()
    assert response.json()["token_type"] == "bearer"


def test_login_for_access_token_failure(client, mock_container):
    mock_container.users.get_user_by_username.return_value = None

    response = client.post(
        "/auth/token", data={"username": "wrong", "password": "pass"}
    )

    assert response.status_code == 401


def test_list_sessions_success(client, mock_container):
    mock_container.sessions.list_sessions.return_value = [
        {"id": "s1", "title": "Session 1"}
    ]

    response = client.get("/apps/app/users/testuser/sessions")

    assert response.status_code == 200
    assert len(response.json()["sessions"]) == 1
    assert response.json()["sessions"][0]["id"] == "s1"


def test_create_session_success(client, mock_container):
    mock_container.sessions.ensure_session.return_value = None

    response = client.post(
        "/apps/app/users/testuser/sessions",
        json={"sessionId": "new-session", "state": {}},
    )

    assert response.status_code == 200
    assert response.json() == {"ok": True, "sessionId": "new-session"}


def test_get_session_not_found(client, mock_container):
    mock_container.sessions.get_session.return_value = None

    response = client.get("/apps/app/users/testuser/sessions/unknown")

    assert response.status_code == 404
    assert response.json() == {"error": "session not found"}


def test_delete_session_success(client, mock_container):
    mock_container.sessions.delete_session.return_value = None

    response = client.delete("/apps/app/users/testuser/sessions/s1")

    assert response.status_code == 200
    assert response.json() == {"ok": True}
