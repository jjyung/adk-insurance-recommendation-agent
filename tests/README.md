# 保險推薦代理 (Insurance Agent) 測試說明文件

本目錄包含保險推薦代理的完整測試體系，涵蓋從基礎程式碼品質到 Agent 智慧表現的全面驗證。

## 測試體系總覽

| 測試類型 | 目錄 | 說明 | 關鍵技術 |
| :--- | :--- | :--- | :--- |
| **單元測試 (Unit Tests)** | `tests/unit/` | 驗證核心組件（Auth, User, Session, Tools）的獨立邏輯。 | `pytest`, `unittest.mock` |
| **整合測試 (Integration Tests)** | `tests/integration/`, `tests/api/` | 驗證組件間協作、API 端點、流式傳輸與審計日誌寫入。 | `TestClient`, `asyncpg`, `SSE` |
| **評估測試 (Evaluation Tests)** | `tests/eval/` | 使用 ADK Eval 驗證 Agent 的推薦品質、合規性與對話能力。 | `adk eval`, LLM-as-Judge |
| **安全測試 (Security Tests)** | `tests/security/` | 專注於 PII 脫敏、權限控管與審計完整性。 | `Presidio` (PII), `JWT` |
| **負載測試 (Load Tests)** | `tests/load_test/` | 模擬多使用者並行存取，驗證系統在高負載下的穩定性。 | `Locust` |

---

## 1. 單元測試 (Unit Tests)
主要測試後端核心邏輯，確保每個函式與類別在隔離環境下運作正常。

- **Auth & Security**: 密碼雜湊、JWT 簽發與驗證。
- **User Service**: 使用者資料庫存取邏輯。
- **Session Tools**: Agent 呼叫的狀態讀寫工具（如 `save_user_profile`）。
- **Agent Run Service**: 串流處理邏輯與工具分類。
- **API Routes**: FastAPI 各端點的基礎回應。

**執行指令：**
```bash
pytest tests/unit/
```

## 2. 整合測試 (Integration Tests)
測試多個組件協作的完整流程，通常涉及資料庫存取。

- **Agent Stream**: 模擬真實對話，驗證 Agent 是否能正確產生流式回應。
- **Audit Integration**: 驗證 API 呼叫後，審計日誌是否正確脫敏並寫入資料庫。
- **Session CRUD**: 驗證透過 API 建立、讀取、更新及刪除會話的完整生命週期。

**執行指令：**
```bash
pytest tests/integration/ tests/api/
```

## 3. 評估測試 (Evaluation Tests)
這是 Agent 開發中最關鍵的環節，使用 ADK 框架針對保險業務場景進行評估。

### 核心指標 (Metrics)
*   **Trajectory Score**: 呼叫工具的順序是否正確（如：先讀取畫像再推薦）。
*   **Hallucination Check**: 確保推薦內容完全來自工具，禁止虛構保費或保障。
*   **Compliance Rubric**: 檢查回覆是否包含免責聲明，且無不當保證。
*   **Empathy & Proactivity**: 針對直播模式（Live Mode）測試 Agent 的情感同理與主動建議。

### 測試集分類
*   `core/`: 基礎醫療、家庭保障推薦流程。
*   `safety/`: PII 保護、禁止虛構報酬、合規聲明。
*   `session_aware/`: 跨輪記憶、狀態更新（如：修改預算）。
*   `live/`: 情感對話、語音中斷處理、主動提議。

**執行指令：**
```bash
make eval-all
```

## 4. 其他測試與配置

### 安全與 PII (Security & PII)
位於 `tests/security/`，專門驗證敏感資料處理：
- **PII Redaction**: 測試 Email、電話、身分證字號等是否能被正確識別並遮蔽。
- **Auth Requirements**: 確保所有敏感 API 路徑皆受 JWT 保護。

### 負載測試 (Load Testing)
位於 `tests/load_test/`，使用 Locust 模擬真實使用者行為，測試 SSE 串流在高並發下的效能。

### 環境配置 (`conftest.py`)
- 提供 `postgres_container` 測試用資料庫（含 pgvector）。
- 提供 Mock 的 `app_with_fake_runner` 用於快速 API 測試。
- 強制設定 `GOOGLE_CLOUD_LOCATION` 為 `us-central1` 以確保模型可用性。

---

## 快速參考指令

| 目標 | 指令 |
| :--- | :--- |
| 執行所有測試 | `make test` |
| 執行單元測試 | `pytest tests/unit/` |
| 執行評估測試 (完整) | `make eval-all` |
| 執行安全性評估 | `make eval-safety` |
| 啟動負載測試 | 參考 `tests/load_test/README.md` |
