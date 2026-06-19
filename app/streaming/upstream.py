"""app/streaming/upstream.py

上游任務 (Upstream Task)：從客戶端讀取資料並發送給 Agent 引擎的佇列。

負責持續監聽 WebSocket 的連線，接收來自前端的多模態輸入 (包含 JSON 格式的文字或 base64 編碼，以及直接傳輸的二進位 PCM 音訊)，
經過必要的處理與優化後，轉發至 ADK 的 LiveRequestQueue。
"""

import base64
import io
import json
import logging

from fastapi import WebSocket
from google.adk.agents.live_request_queue import LiveRequestQueue
from google.genai import types
from PIL import Image

logger = logging.getLogger("app.streaming.upstream")


def _wrap_error_message(message: str) -> str:
    """將內部錯誤轉換為可回傳給前端的 JSON 格式。"""
    return json.dumps({"server_type": "error", "data": {"message": message}})


def _resize_image_if_needed(image_bytes: bytes, max_size: int = 1024) -> bytes:
    """
    將使用者上傳的圖片調整為適合 Gemini Live API 的大小與格式。

    考量點：
    1. Gemini 模型對於過大的圖片可能會處理緩慢或出現維度錯誤。
    2. 建議解析度限制在最大邊不超過 1024 像素。
    3. 統一轉換為 RGB 模式並存為 JPEG，可避免 PNG 透明通道造成的無法預期行為，並能有效縮減資料傳輸量。
    """
    try:
        img = Image.open(io.BytesIO(image_bytes))
        # 轉為 RGB 格式 (避免 PNG 的 Alpha 通道問題)
        if img.mode != "RGB":
            img = img.convert("RGB")

        w, h = img.size
        # 只有在圖片任一邊長超過 max_size 時才進行等比例縮放
        if w > max_size or h > max_size:
            if w > h:
                new_w = max_size
                new_h = int(h * (max_size / w))
            else:
                new_h = max_size
                new_w = int(w * (max_size / h))
            # 使用 LANCZOS 演算法獲得較好的縮放品質
            img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
            logger.info(f"Image resized from {w}x{h} to {img.size[0]}x{img.size[1]}")

        output = io.BytesIO()
        img.save(output, format="JPEG", quality=85)
        return output.getvalue()
    except Exception as e:
        # 如果影像處理失敗，作為降級策略，返回原始資料交由模型嘗試處理
        logger.warning(f"圖片調整大小失敗: {e}，將使用原始資料")
        return image_bytes


async def upstream_task(
    websocket: WebSocket,
    live_request_queue: LiveRequestQueue,
) -> None:
    """
    持續讀取 WebSocket 訊息並將內容轉發給 ADK LiveRequestQueue。
    此為一個無窮迴圈，直到 WebSocket 斷線或收到明確的關閉指令。
    """
    while True:
        try:
            # 阻塞等待前端傳來下一筆訊息
            message = await websocket.receive()

            # 處理 FastAPI 偵測到的 WebSocket 實體斷線事件
            if message.get("type") == "websocket.disconnect":
                logger.info(
                    f"WebSocket upstream 任務因中斷而關閉 (code: {message.get('code')})。"
                )
                live_request_queue.close()
                break

            # 處理二進位資料（通常這被約定為來自麥克風的原始 PCM 音訊流）
            if "bytes" in message:
                audio_data = message["bytes"]
                logger.debug(
                    f"收到來自前端的二進位語音資料 (大小: {len(audio_data)} bytes)"
                )
                audio_blob = types.Blob(
                    mime_type="audio/pcm;rate=16000",
                    data=audio_data,
                )
                live_request_queue.send_realtime(audio_blob)

            # 處理文字 JSON 資料
            elif "text" in message:
                payload = json.loads(message["text"])
                msg_type = payload.get("type")

                # 處理純文字輸入
                if msg_type == "text":
                    content = types.Content(
                        parts=[types.Part(text=payload.get("text", ""))]
                    )
                    # 文字訊息使用 send_content 傳送，這表示一個完整的上下文對話意圖
                    live_request_queue.send_content(content)

                # 處理 Base64 編碼的音訊資料 (相較於純 bytes，這允許附帶更多 metadata)
                elif msg_type == "audio":
                    audio_bytes = base64.b64decode(payload["data"])
                    logger.debug(
                        f"收到來自前端的語音資料 (大小: {len(audio_bytes)} bytes)"
                    )
                    audio_blob = types.Blob(
                        mime_type=payload.get("mimeType", "audio/pcm;rate=16000"),
                        data=audio_bytes,
                    )
                    # 即時語音使用 send_realtime 傳送，會被累加並串流至模型
                    live_request_queue.send_realtime(audio_blob)

                # 處理圖片上傳
                elif msg_type == "image":
                    image_bytes = base64.b64decode(payload["data"])
                    text = payload.get("text")

                    # 進行圖片優化：調整大小並統一轉為 JPEG
                    optimized_image = _resize_image_if_needed(image_bytes)

                    # 使用 send_realtime 發送圖片 Blob，這在 Live API 中通常比 send_content 更穩定
                    # 並能避免部分模型在處理 Content Image 時出現的維度不匹配問題 (1007 None)
                    image_blob = types.Blob(
                        mime_type="image/jpeg",
                        data=optimized_image,
                    )
                    live_request_queue.send_realtime(image_blob)

                    # 如果有附帶文字，則以 content 方式發送以觸發模型針對該圖片回覆
                    # 如果沒有文字，則發送預設提示讓模型開始主動分析
                    prompt_text = text if text else "這是我剛上傳的圖片，請分析內容。"
                    content = types.Content(
                        parts=[types.Part.from_text(text=prompt_text)]
                    )
                    live_request_queue.send_content(content)

                # 處理來自攝影機或螢幕分享的連續影像幀
                elif msg_type == "video_frame":
                    frame_bytes = base64.b64decode(payload["data"])
                    frame_blob = types.Blob(
                        mime_type=payload.get("mimeType", "image/jpeg"),
                        data=frame_bytes,
                    )
                    live_request_queue.send_realtime(frame_blob)

                # 處理前端應用層發送的關閉指令
                elif msg_type == "close":
                    logger.info("收到客戶端發出的 close 訊息。")
                    live_request_queue.close()
                    break

                # 處理未知的訊息格式
                else:
                    await websocket.send_text(
                        _wrap_error_message(
                            f"Unknown upstream message type: {msg_type}"
                        )
                    )

        except Exception as e:
            error_msg = str(e)
            # 過濾並正常處理連線關閉的例外狀況
            if any(
                msg in error_msg
                for msg in [
                    "1000 None",
                    "ConnectionClosedOK",
                    "Handshake status 1000",
                    "EOF received",
                ]
            ):
                logger.info("WebSocket upstream 任務正常結束。")
            else:
                logger.error(f"Upstream task 發生非預期錯誤: {e}")

            # 確保佇列被關閉，避免資源洩漏
            live_request_queue.close()
            break
