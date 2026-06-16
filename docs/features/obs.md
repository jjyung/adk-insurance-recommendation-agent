# 保險推薦 Agent 可觀測性 (Observability) 技術指南

本文件描述 `insurance-recommendation-agent` 專案中實作的可觀測性架構，包含追蹤 (Tracing)、日誌 (Logging)、稽核 (Auditing) 以及深度分析 (Analytics) 的設計與操作指南。

## 1. 架構概覽

專案採用多層次的可觀測性設計，結合了 Google Cloud 原生服務與 Agent Development Kit (ADK) 內建功能：

1.  **Agent Tracing (執行緒追蹤)**: 基於 OpenTelemetry (OTel) Semantic Conventions。
2.  **Structured Logging (結構化日誌)**: 整合 Google Cloud Logging 與 GCS Prompt/Response 備份。
3.  **Security Audit Logs (安全稽核)**: 使用 PostgreSQL 搭配雜湊鏈 (Hash Chain) 確保資料防竄改。
4.  **BigQuery Agent Analytics (深度分析)**: 非同步捕捉 Agent 的完整生命週期事件，供離線分析與營運監控。

---

## 2. 核心元件實作說明

### 2.1 Agent Tracing (分散式追蹤)

專案預設啟用了 ADK 的遙測功能，並遵循 OpenTelemetry 針對 GenAI 的語意規範。

*   **實作位置**: `app/app_utils/telemetry.py`
*   **關鍵功能**: 自動捕捉 `invoke_agent`、`generate_content` (LLM 呼叫)、`execute_tool` 等關鍵路徑。
*   **自定義工具追蹤 (Custom Tool Instrumentation)**:
    在 `app/tools/session_tools.py` 中，我們透過 `@tracer.start_as_current_span` 裝飾器為本地會話工具加入了自定義追蹤：
    *   `get_user_profile_snapshot`
    *   `save_user_profile`
    *   `save_last_recommendation`
    *   `clear_last_recommendation`
    *   *效益*: 允許在 Trace Explorer 中精確查看這些本地操作的耗時與關鍵屬性（如更新的欄位數量），不會紀錄 PII 敏感資訊。

### 2.2 Structured Logging (結構化日誌)

*   **Cloud Logging**: 在 `app/agent_engine_app.py` 整合，特別用於記錄 `register_feedback` 等使用者回饋行為。
*   **Prompt/Response Logging**: 可透過設定 `LOGS_BUCKET_NAME` 將模型的輸入輸出以 JSONL 格式上傳至 Google Cloud Storage (GCS)。支援 `NO_CONTENT` 模式以保護使用者隱私。

### 2.3 Security Audit Logs (安全稽核日誌)

*   **實作位置**: `app/services/audit_log_service.py`
*   **功能**: 將關鍵事件（包含 PII 去識別化後的資料）存儲於關聯式資料庫 (PostgreSQL)。使用前後事件的 Hash Chain 設計，確保日誌不可被篡改。

### 2.4 BigQuery Agent Analytics (深度分析插件)

為解決單純日誌與追蹤在「聚合分析」與「成本監控」上的不足，專案整合了 `BigQueryAgentAnalyticsPlugin`。

*   **實作位置**: `app/config.py` 與 `app/agent.py`。
*   **核心功能**: 將對話的每個 Turn (如 `LLM_REQUEST`, `LLM_RESPONSE`, `TOOL_COMPLETED`, `STATE_DELTA`) 非同步且結構化地寫入 BigQuery。
*   **預期效益**:
    *   **成本分析**: 輕鬆加總 Token 使用量 (`v_llm_response`)。
    *   **效能監控**: 聚合查詢特定工具的平均耗時 (`v_tool_completed`)。
    *   **意圖分析**: 關聯使用者輸入與最終 Agent 推薦行為。
    *   **AI 自動化除錯**: 可透過 BQML (`AI.GENERATE`) 自動診斷失敗的 Session。

---

## 3. 環境配置與部署指南

### 3.1 地端開發模式 (Local Development)

在地端執行 `make playground` 時，可觀測性架構具備**優雅降級 (Graceful Degradation)** 特性。
*   **OpenTelemetry**: 會自動切換至 No-Op 模式，自定義 Span 裝飾器與屬性記錄不會拋出錯誤，完全不影響效能。
*   **BigQuery**: 若未設定 `BQ_ANALYTICS_DATASET` 環境變數，插件將不會被初始化。

### 3.2 雲端部署環境變數 (GCP Deployment)

在部署至 Google Cloud (Cloud Run 或 Agent Engine) 時，請確保配置以下環境變數以啟動完整可觀測性：

#### 必填/核心配置
*   `GOOGLE_CLOUD_AGENT_ENGINE_ENABLE_TELEMETRY=true` (啟用 OTel)
*   `GOOGLE_CLOUD_PROJECT=<您的 GCP 專案 ID>`
*   `ENABLE_CLOUD_TRACING=true` (啟用雲端 OpenTelemetry 追蹤匯出至 Cloud Trace)
*   `ENABLE_CLOUD_LOGGING=true` (啟用雲端結構化日誌匯出至 Cloud Logging)

#### BigQuery Analytics (建議啟用)
*   `BQ_ANALYTICS_DATASET=<資料集名稱>` (例如: `agent_analytics`)
*   `BQ_LOCATION=<資料集位置>` (例如: `US` 或 `asia-east1`，預設為 `US`)

#### Prompt/Response Logging (選用)
*   `LOGS_BUCKET_NAME=gs://<您的_GCS_Bucket_名稱>`
*   `OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT=true` (若需要記錄完整 Prompt，預設為 `NO_CONTENT`)

### 3.3 IAM 權限設定

部署的 Service Account 需要以下 GCP 權限才能發送可觀測性資料：
*   `roles/cloudtrace.agent` (發送追蹤資料)
*   `roles/logging.logWriter` (寫入標準日誌)
*   `roles/bigquery.dataEditor` (寫入 BigQuery Analytics)
*   `roles/bigquery.jobUser` (於專案內執行 BQ 作業)
*   `roles/storage.objectAdmin` (選配，若需寫入 GCS Prompt Logs)

---

## 4. 常用分析 SQL (BigQuery Recipes)

以下提供幾個常見的營運分析查詢範例（需在 BigQuery Console 執行）：

### 4.1 計算平均 Token 消耗與延遲
```sql
SELECT
  AVG(usage_total_tokens) as avg_tokens,
  AVG(total_ms) as avg_llm_ms
FROM `您的專案ID.您的資料集.v_llm_response`;
```

### 4.2 尋找最耗時的工具
```sql
SELECT
  tool_name,
  tool_origin,
  COUNT(*) as call_count,
  AVG(total_ms) as avg_latency_ms
FROM `您的專案ID.您的資料集.v_tool_completed`
GROUP BY tool_name, tool_origin
ORDER BY avg_latency_ms DESC;
```

### 4.3 追蹤特定對話的完整過程
```sql
SELECT
  timestamp,
  event_type,
  agent,
  JSON_VALUE(content, '$.response') as response_summary
FROM `您的專案ID.您的資料集.agent_events`
WHERE trace_id = '在此填入目標_Trace_ID'
ORDER BY timestamp ASC;
```
