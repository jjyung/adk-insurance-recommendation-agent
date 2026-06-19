"""app/streaming/downstream.py

下游任務 (Downstream Task)：從 Agent 讀取資料並傳送給客戶端。

此模組負責執行 runner.run_live()，從 Google GenAI Live API 接收即時的事件流 (文字、音訊、工具呼叫結果)，
將這些事件序列化為 JSON，並透過 WebSocket 轉發回前端客戶端。
"""

import json
import logging

from fastapi import WebSocket
from google.adk.agents.run_config import RunConfig
from google.adk.agents.live_request_queue import LiveRequestQueue
from google.adk.runners import Runner

logger = logging.getLogger("app.streaming.downstream")

# 不可恢復的終端錯誤類型，遇到這些錯誤時應立即中斷連線並通知前端
TERMINAL_ERROR_CODES = {
    "SAFETY",  # 觸發安全守門員機制 (如色情、暴力)
    "PROHIBITED_CONTENT",  # 觸發被禁止的內容政策
    "BLOCKLIST",  # 觸發黑名單字詞
    "MAX_TOKENS",  # 達到對話歷史長度或輸出 Token 的硬限制
    "RESOURCE_EXHAUSTED",  # API 配額耗盡 (例如併發連線數過多)
}


def _wrap_error_message(code: str, message: str) -> str:
    """將錯誤訊息封裝成前端約定的 JSON 格式。"""
    return json.dumps(
        {"server_type": "error", "data": {"code": code, "message": message}}
    )


async def downstream_task(
    websocket: WebSocket,
    runner: Runner,
    user_id: str,
    session_id: str,
    live_request_queue: LiveRequestQueue,
    run_config: RunConfig,
) -> None:
    """
    執行 runner.run_live 並監聽產生的事件，將其發送至客戶端。
    """
    try:
        # 開始一個非同步的 Live API 執行迴圈
        async for event in runner.run_live(
            user_id=user_id,
            session_id=session_id,
            live_request_queue=live_request_queue,
            run_config=run_config,
        ):
            # 記錄轉錄日誌（方便調試），這包含了使用者語音轉文字的結果，以及模型即將輸出的語音對應文字
            if event.input_transcription and event.input_transcription.text:
                logger.info(f"[In-Transcription] {event.input_transcription.text}")
            if event.output_transcription and event.output_transcription.text:
                logger.info(f"[Out-Transcription] {event.output_transcription.text}")

            # 處理從 ADK 回傳的錯誤事件
            if event.error_code:
                error_message = event.error_message or "Unknown error"
                # 如果是正常中斷訊息（例如 1000 None），則不視為錯誤，僅記錄並繼續處理下一個事件或結束
                if any(
                    msg in error_message
                    for msg in [
                        "1000 None",
                        "ConnectionClosedOK",
                        "Handshake status 1000",
                        "EOF received",
                    ]
                ):
                    logger.info(f"忽略 Agent Event 中的正常中斷訊息: {error_message}")
                    continue

                logger.error(
                    f"Agent Event Error: {event.error_code} - {event.error_message}"
                )
                # 將錯誤訊息通知前端
                await websocket.send_text(
                    _wrap_error_message(
                        event.error_code, event.error_message or "Unknown error"
                    )
                )

                # 若是嚴重錯誤，主動中斷迴圈以釋放資源
                if event.error_code in TERMINAL_ERROR_CODES:
                    logger.warning("檢測到致命錯誤，即將中斷連線。")
                    break
                continue

            # 正常事件處理：將 ADK 事件物件序列化為 JSON 字串
            # exclude_none=True 避免傳送大量不必要的空值欄位
            # by_alias=True 確保產生的 JSON 鍵名符合 CamelCase 等預期格式
            event_json = event.model_dump_json(exclude_none=True, by_alias=True)
            try:
                # 透過 WebSocket 將事件推送到前端
                await websocket.send_text(event_json)
            except Exception as send_err:
                logger.warning(f"無法發送事件至 WebSocket (可能已斷線): {send_err}")
                break

    except Exception as e:
        # 捕捉在 run_live 執行期間拋出的例外
        # Check if the error is a normal disconnect (1000 OK)
        error_msg = str(e)
        if any(
            msg in error_msg
            for msg in [
                "1000 None",
                "ConnectionClosedOK",
                "Handshake status 1000",
                "EOF received",
            ]
        ):
            logger.info("下游任務結束：連線正常關閉。")
            return

        logger.error(f"Downstream task 發生錯誤: {e}")
        error_code = "INTERNAL_ERROR"

        # 針對特定常見的例外提供更友善的錯誤訊息
        if "RESOURCE_EXHAUSTED" in error_msg:
            error_code = "RESOURCE_EXHAUSTED"
            error_msg = "Gemini API 最大並行工作階段數已達上限，請稍後再試。"

        try:
            await websocket.send_text(_wrap_error_message(error_code, error_msg))
        except RuntimeError as rt_err:
            logger.warning(f"無法發送錯誤訊息至 WebSocket，連線可能已關閉: {rt_err}")
