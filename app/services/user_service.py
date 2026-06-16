from __future__ import annotations

import asyncpg

from app.api.schemas import UserInDB


class UserService:
    def __init__(self, db_url: str):
        # Strip +asyncpg from the scheme if present, as asyncpg.connect expects standard postgresql://
        if "postgresql+asyncpg://" in db_url:
            self.db_url = db_url.replace("postgresql+asyncpg://", "postgresql://")
        else:
            self.db_url = db_url

    async def get_user_by_username(self, username: str) -> UserInDB | None:
        conn = await asyncpg.connect(self.db_url)
        try:
            row = await conn.fetchrow(
                "SELECT user_id, username, hashed_password, is_active FROM users WHERE username = $1",
                username,
            )
            if row:
                return UserInDB(
                    user_id=row["user_id"],
                    username=row["username"],
                    hashed_password=row["hashed_password"],
                    is_active=bool(row["is_active"]),
                )
        finally:
            await conn.close()
        return None

    async def create_user(self, username: str, hashed_password: str) -> int:
        conn = await asyncpg.connect(self.db_url)
        try:
            # PostgreSQL uses RETURNING for getting the inserted ID
            user_id = await conn.fetchval(
                "INSERT INTO users (username, hashed_password) VALUES ($1, $2) RETURNING user_id",
                username,
                hashed_password,
            )
            return user_id
        finally:
            await conn.close()
