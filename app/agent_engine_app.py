# Copyright 2026 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
import logging
import os
from typing import Any

import vertexai
from dotenv import load_dotenv
from google.adk.artifacts import GcsArtifactService, InMemoryArtifactService
from google.cloud import logging as google_cloud_logging
from vertexai.agent_engines.templates.adk import AdkApp

from app.agent import app as adk_app
from app.app_utils.telemetry import setup_telemetry
from app.app_utils.typing import Feedback

# Load environment variables from .env file at runtime
load_dotenv()


class AgentEngineApp(AdkApp):
    """
    Vertex AI Agent Engine 的封裝類別。
    繼承自 AdkApp，將 Google ADK 的 App 轉換為 Agent Engine 可識別的格式。
    """

    def set_up(self) -> None:
        """
        初始化 Agent Engine 應用程式。
        此方法在服務啟動時由系統自動調用，用於配置日誌、追蹤與環境變數。
        """
        # 初始化 Vertex AI SDK
        vertexai.init()

        # 設定 OpenTelemetry 追蹤與日誌，用於 GCS 上的 Prompt/Response 記錄
        setup_telemetry()

        # 呼叫父類別的設定邏輯
        super().set_up()

        # 配置標準 Python 日誌輸出級別
        logging.basicConfig(level=logging.INFO)

        # 初始化 Google Cloud Logging 客戶端，用於結構化日誌記錄
        logging_client = google_cloud_logging.Client()
        self.logger = logging_client.logger(__name__)

        # 如果環境變數中指定了位置，則確保系統識別正確的雲端區域
        if gemini_location:
            os.environ["GOOGLE_CLOUD_LOCATION"] = gemini_location

    def register_feedback(self, feedback: dict[str, Any]) -> None:
        """
        註冊並記錄使用者的回饋資料。

        Args:
            feedback: 包含評分 (score) 與評論 (text) 的原始字典。
        """
        # 使用 Pydantic 模型驗證傳入的資料格式是否符合規範
        feedback_obj = Feedback.model_validate(feedback)

        # 將驗證後的資料以結構化日誌形式寫入 Cloud Logging，方便後續大數據分析 (如 BigQuery)
        self.logger.log_struct(feedback_obj.model_dump(), severity="INFO")

    def register_operations(self) -> dict[str, list[str]]:
        """
        註冊代理人支援的操作 (Operations)。

        這些操作會公開給 Agent Engine，使其能被外部呼叫 (如 Vertex AI 控制台)。
        """
        # 獲取父類別已註冊的操作 (如 run, list_sessions 等)
        operations = super().register_operations()

        # 將自定義的 'register_feedback' 加入公開操作清單中
        operations[""] = operations.get("", []) + ["register_feedback"]
        return operations


# 從環境變數讀取執行區域與日誌儲存時的 GCS Bucket 名稱
gemini_location = os.environ.get("GOOGLE_CLOUD_LOCATION")
logs_bucket_name = os.environ.get("LOGS_BUCKET_NAME")

# 建立 Agent Engine 應用程式實例
# 使用 artifact_service_builder 來決定日誌物件的存儲方式 (GCS 或 記憶體)
agent_engine = AgentEngineApp(
    app=adk_app,
    artifact_service_builder=lambda: (
        GcsArtifactService(bucket_name=logs_bucket_name)
        if logs_bucket_name
        else InMemoryArtifactService()
    ),
)
