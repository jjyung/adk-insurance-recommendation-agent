import pytest
from unittest.mock import AsyncMock, patch
from app.services.user_service import UserService


@pytest.mark.asyncio
async def test_get_user_by_username_exists():
    db_url = "postgresql://user:pass@localhost/db"
    service = UserService(db_url)

    mock_conn = AsyncMock()
    mock_conn.fetchrow.return_value = {
        "user_id": 1,
        "username": "testuser",
        "hashed_password": "hashed_pass",
        "is_active": True,
    }

    with patch("asyncpg.connect", return_value=mock_conn):
        user = await service.get_user_by_username("testuser")

        assert user is not None
        assert user.user_id == 1
        assert user.username == "testuser"
        assert user.is_active is True
        mock_conn.fetchrow.assert_called_once()
        mock_conn.close.assert_called_once()


@pytest.mark.asyncio
async def test_get_user_by_username_not_found():
    db_url = "postgresql://user:pass@localhost/db"
    service = UserService(db_url)

    mock_conn = AsyncMock()
    mock_conn.fetchrow.return_value = None

    with patch("asyncpg.connect", return_value=mock_conn):
        user = await service.get_user_by_username("unknown")

        assert user is None
        mock_conn.fetchrow.assert_called_once()
        mock_conn.close.assert_called_once()


@pytest.mark.asyncio
async def test_create_user_success():
    db_url = "postgresql://user:pass@localhost/db"
    service = UserService(db_url)

    mock_conn = AsyncMock()
    mock_conn.fetchval.return_value = 101

    with patch("asyncpg.connect", return_value=mock_conn):
        user_id = await service.create_user("newuser", "newhash")

        assert user_id == 101
        mock_conn.fetchval.assert_called_once()
        mock_conn.close.assert_called_once()
