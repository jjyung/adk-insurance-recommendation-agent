from __future__ import annotations

import asyncio
import logging

from fastapi import WebSocket, WebSocketDisconnect
from google.adk.agents.live_request_queue import LiveRequestQueue
from google.adk.agents.run_config import RunConfig, StreamingMode
from google.adk.runners import Runner
from google.genai import types

from app.config import AppRuntimeConfig
from app.streaming.downstream import downstream_task
from app.streaming.upstream import upstream_task
from app.services.session_service import SessionService

logger = logging.getLogger("app.services.live_agent_service")

"""
app/services/live_agent_service.py

此模組負責管理與 Google GenAI Multimodal Live API 的互動。
相較於一般的單次回應 (REST/SSE)，Live API 支援真正的雙向串流 (Bidi-streaming)，
允許語音、影像等資料在 Agent 與 Client 之間即時雙向傳輸。
"""


class LiveAgentService:
    """
    管理 ADK Gemini Live API Toolkit 執行週期的核心服務。
    負責配置 RunConfig 並協調非同步的上下游串流任務 (Upstream/Downstream Tasks)。
    """

    def __init__(
        self,
        runner: Runner,
        sessions: SessionService,
        config: AppRuntimeConfig,
    ) -> None:
        self._runner = runner
        self._sessions = sessions
        self._config = config

    def create_run_config(
        self, proactivity: bool = False, affective_dialog: bool = False
    ) -> RunConfig:
        """
        根據配置與前端請求，建立對應的 RunConfig。
        此配置決定了與 Gemini 模型連線時的行為與能力。
        """
        return RunConfig(
            # 啟用語音回應模態
            response_modalities=["AUDIO"],
            # 設定為雙向串流模式
            streaming_mode=StreamingMode.BIDI,
            # 語音合成 (TTS) 配置，選擇預建語音 "Puck"
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name="Puck")
                ),
            ),
            # 語音識別 (STT) 配置，設定語言為繁體中文
            input_audio_transcription=types.AudioTranscriptionConfig(
                language_codes=["zh-TW"]
            ),
            output_audio_transcription=types.AudioTranscriptionConfig(
                language_codes=["zh-TW"]
            ),
            # 啟用工作階段恢復 (讓 Live API 知道延續哪一個對話上下文)
            session_resumption=types.SessionResumptionConfig(),
            # 主動發話功能開關 (如果啟用，模型會在適當時機主動發言)
            proactivity=(
                types.ProactivityConfig(proactive_audio=True) if proactivity else None
            ),
        )

    async def execute_live_session(
        self,
        websocket: WebSocket,
        session_id: str,
        user_id: str | None = None,
        proactivity: bool = False,
        affective_dialog: bool = False,
    ) -> None:
        """
        執行並管理一個完整的 WebSocket 雙向串流會話。
        
        執行流程：
        1. 準備設定檔與建立溝通佇列。
        2. 確保 Session 在資料庫中存在。
        3. 啟動非同步的上游 (Client -> Agent) 與下游 (Agent -> Client) 任務。
        4. 監控任務執行，任一任務異常即進行資源回收並中斷。
        """
        resolved_user_id = user_id or self._config.api_user_id
        run_config = self.create_run_config(
            proactivity=proactivity, affective_dialog=affective_dialog
        )
        
        # 建立即時請求佇列，作為 WebSocket 與 ADK Runner 之間的緩衝區
        live_request_queue = LiveRequestQueue()

        logger.info(
            f"啟動 Live Session: session_id={session_id}, user_id={resolved_user_id}"
        )

        # 確保 Session 存在，避免在 Live 連線過程中發生 SessionNotFoundError
        await self._sessions.ensure_session(session_id, user_id=resolved_user_id)

        try:
            # 建立上游任務：負責接收 WebSocket 訊息並塞入 live_request_queue
            upstream = asyncio.create_task(upstream_task(websocket, live_request_queue))
            
            # 建立下游任務：負責讀取 ADK Runner 回應並透過 WebSocket 發送
            downstream = asyncio.create_task(
                downstream_task(
                    websocket,
                    self._runner,
                    resolved_user_id,
                    session_id,
                    live_request_queue,
                    run_config,
                )
            )

            try:
                # 監控兩個任務，使用 return_when=asyncio.FIRST_EXCEPTION 
                # 確保任一任務失敗時能立即做出反應
                done, pending = await asyncio.wait(
                    [upstream, downstream], return_when=asyncio.FIRST_EXCEPTION
                )

                # 如果有任何任務因為異常結束，記錄錯誤日誌
                for task in done:
                    if task.exception():
                        logger.error(
                            f"Task finished with exception: {task.exception()}"
                        )

                # 取消尚未完成的剩餘任務，優雅地關閉連線
                for task in pending:
                    task.cancel()
                    try:
                        await task
                    except asyncio.CancelledError:
                        pass
            except WebSocketDisconnect:
                # 客戶端主動斷線屬於正常行為
                logger.debug("客戶端正常斷開連線")
            except Exception as e:
                # 其他非預期例外
                logger.error(f"Error while waiting for tasks: {e}", exc_info=True)
                for task in [upstream, downstream]:
                    if not task.done():
                        task.cancel()

        finally:
            # 確保佇列被關閉，釋放底層的 gRPC / HTTP 資源
            live_request_queue.close()
            logger.info(f"Live Session 結束並關閉 Queue: session_id={session_id}")
