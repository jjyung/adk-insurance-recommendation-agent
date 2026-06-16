from __future__ import annotations

import logging
import uuid

from fastapi import APIRouter, Request, Depends
from fastapi.responses import JSONResponse

from app.api.dependencies import get_container, get_current_user
from app.api.schemas import SessionCreateRequest
from app.services.session_service import SessionService
from app.api.schemas import UserInDB

"""
app/api/routes/sessions.py

此模組實作了對話會話 (Session) 管理的 CRUD API 端點。
提供前端查詢歷史對話列表、獲取單一對話詳情、建立與刪除對話的功能。
"""

router = APIRouter(tags=["sessions"])

_logger = logging.getLogger(__name__)


def _get_session_service(request: Request) -> SessionService:
    """
    從相依性注入容器中獲取 Session 管理服務。
    """
    return get_container(request).sessions


def _check_app_name(app_name: str, request: Request) -> bool:
    """
    驗證請求中的應用程式名稱是否與伺服器目前配置的名稱相符。
    這是為了防止多租戶或多應用環境下的誤操作。
    """
    return app_name == get_container(request).config.app_name


# ─── 列出會話 ────────────────────────────────────────────────────────────


@router.get("/apps/{app_name}/users/{user_id}/sessions")
async def list_sessions(
    app_name: str,
    user_id: str,
    request: Request,
    current_user: UserInDB = Depends(get_current_user),
):
    """
    列出特定使用者在特定應用下的所有對話會話。
    
    執行流程：
    1. 驗證權限：確認操作者身份與目標 user_id 一致。
    2. 驗證應用程式名稱。
    3. 呼叫 SessionService.list_sessions() 獲取格式化後的列表。
    """
    if current_user.username != user_id:
        return JSONResponse(status_code=403, content={"error": "forbidden"})

    if not _check_app_name(app_name, request):
        return JSONResponse(status_code=404, content={"error": "app not found"})
    try:
        sessions = await _get_session_service(request).list_sessions(user_id=user_id)
        return {"sessions": sessions}
    except Exception as exc:
        _logger.warning("list_sessions failed: %s", exc)
        # 如果發生錯誤 (如資料庫連線失敗)，為了不影響前端渲染，回傳空列表
        return {"sessions": []}


# ─── 建立會話 ───────────────────────────────────────────────────────────


@router.post("/apps/{app_name}/users/{user_id}/sessions")
async def create_session(
    app_name: str,
    user_id: str,
    payload: SessionCreateRequest,
    request: Request,
    current_user: UserInDB = Depends(get_current_user),
):
    """
    為特定使用者建立新的對話會話。
    
    執行流程：
    1. 驗證權限與應用名稱。
    2. 如果前端未提供 sessionId，則系統自動生成一個 UUID。
    3. 呼叫 SessionService 確保會話建立，並將初始狀態 (如有的話) 寫入。
    """
    if current_user.username != user_id:
        return JSONResponse(status_code=403, content={"error": "forbidden"})

    if not _check_app_name(app_name, request):
        return JSONResponse(status_code=404, content={"error": "app not found"})

    session_id = (payload.sessionId or "").strip() or str(uuid.uuid4())

    try:
        # 確保會話存在於儲存中，並可選地初始化狀態
        await _get_session_service(request).ensure_session(
            session_id, payload.state, user_id=user_id
        )
        return {"ok": True, "sessionId": session_id}
    except Exception as exc:
        return JSONResponse(
            status_code=502,
            content={"error": f"Failed to create session: {exc}"},
        )


# ─── 獲取會話詳情 ──────────────────────────────────────────────────────────────


@router.get("/apps/{app_name}/users/{user_id}/sessions/{session_id}")
async def get_session(
    app_name: str,
    user_id: str,
    session_id: str,
    request: Request,
    current_user: UserInDB = Depends(get_current_user),
):
    """
    獲取指定會話的詳細資訊 (包含狀態與歷史)。
    
    執行流程：
    1. 驗證權限與應用名稱。
    2. 透過 SessionService 獲取格式化的 Session 資料。
    3. 若找不到則回傳 404 Not Found。
    """
    if current_user.username != user_id:
        return JSONResponse(status_code=403, content={"error": "forbidden"})

    if not _check_app_name(app_name, request):
        return JSONResponse(status_code=404, content={"error": "app not found"})

    session_data = await _get_session_service(request).get_session(
        session_id, user_id=user_id
    )
    if session_data is None:
        return JSONResponse(status_code=404, content={"error": "session not found"})
    return session_data


# ─── 刪除會話 ───────────────────────────────────────────────────────────


@router.delete("/apps/{app_name}/users/{user_id}/sessions/{session_id}")
async def delete_session(
    app_name: str,
    user_id: str,
    session_id: str,
    request: Request,
    current_user: UserInDB = Depends(get_current_user),
):
    """
    刪除指定的對話會話。
    
    執行流程：
    1. 驗證權限與應用名稱。
    2. 驗證 sessionId 是否有效。
    3. 呼叫 SessionService 從資料庫中刪除該筆紀錄。
    """
    if current_user.username != user_id:
        return JSONResponse(status_code=403, content={"error": "forbidden"})

    if not _check_app_name(app_name, request):
        return JSONResponse(status_code=404, content={"error": "app not found"})

    normalized_session_id = session_id.strip()
    if not normalized_session_id:
        return JSONResponse(
            status_code=400,
            content={"error": "sessionId is required"},
        )

    try:
        await _get_session_service(request).delete_session(
            normalized_session_id, user_id=user_id
        )
        return {"ok": True}
    except Exception as exc:
        return JSONResponse(
            status_code=502,
            content={"error": f"Failed to delete session: {exc}"},
        )
