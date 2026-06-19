from __future__ import annotations

import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status

from app.api.dependencies import get_container
from app.security.auth import decode_access_token

"""
app/api/routes/live.py

此模組實作了與 Google GenAI Multimodal Live API 互動的 WebSocket 端點。
允許客戶端透過長連線進行即時語音、影像與文字的雙向對話。
"""

# 定義路由，統一加上前綴與標籤
router = APIRouter(prefix="/api/agent/live", tags=["agent_live"])
logger = logging.getLogger("app.api.routes.live")


@router.websocket("/ws/{session_id}")
async def websocket_live_endpoint(
    websocket: WebSocket,
    session_id: str,
    user_id: str | None = None,
    proactivity: bool = False,
    affective_dialog: bool = False,
    token: str | None = Query(None),
) -> None:
    """
    ADK Gemini Live API Toolkit WebSocket 端點。
    支援音訊、影像、視訊與文字的全雙工串流。

    執行流程：
    1. 接收 WebSocket 升級請求。
    2. 由於 WebSocket 無法輕易攜帶 Authorization Header，故手動從 Query Parameter 解析 Token 並進行 JWT 驗證。
    3. 驗證通過後，接受連線 (`websocket.accept()`)。
    4. 將功能開關 (如主動發話、同理心對話) 寫入 Session State 中，讓 Agent Prompt 能讀取。
    5. 委託 LiveAgentService 啟動並管理雙向串流任務。
    """
    # 獲取應用程式容器
    container = get_container()

    # 手動驗證 Token (因為 WebSocket 常使用 Query Parameter 傳遞 Token)
    if token:
        # 解碼 JWT Token
        payload = decode_access_token(
            token, container.config.jwt_secret, container.config.jwt_algorithm
        )
        if payload is None:
            # Token 無效，拒絕連線並回傳 1008 Policy Violation 狀態碼
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        username = payload.get("sub")
        if not isinstance(username, str):
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        # 查詢資料庫確認使用者狀態
        current_user = await container.users.get_user_by_username(username)
        if not current_user:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        # 若前端指定了 user_id，驗證是否與 Token 中的身分一致，防止越權操作
        if user_id and current_user.username != user_id:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
    else:
        # 為了安全性，如果完全沒提供 Token 則拒絕連線
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    logger.info(
        f"WebSocket 連線請求: session_id={session_id}, "
        f"user_id={user_id or container.config.api_user_id}, "
        f"proactivity={proactivity}, affective_dialog={affective_dialog}"
    )

    # 驗證通過，正式建立 WebSocket 連線
    await websocket.accept()

    try:
        # 將前端傳入的功能開關寫入 Session State
        # Agent 在執行時可透過 get_user_profile_snapshot 工具讀取這些設定，調整行為模式
        await container.sessions.update_session(
            session_id,
            {
                "config:proactive_enabled": proactivity,
                "config:affective_enabled": affective_dialog,
            },
        )

        # 委託給 LiveAgentService 處理核心的 ADK Runner 啟動與串流邏輯
        await container.live_agent.execute_live_session(
            websocket=websocket,
            session_id=session_id,
            user_id=user_id,
            proactivity=proactivity,
            affective_dialog=affective_dialog,
        )
    except WebSocketDisconnect:
        # 處理客戶端主動斷線的情況
        logger.info(f"客戶端已中斷 WebSocket 連線: session_id={session_id}")
    except Exception as e:
        # 記錄其他非預期的伺服器端錯誤
        logger.error(f"WebSocket 串流任務發生錯誤: {e}", exc_info=True)
