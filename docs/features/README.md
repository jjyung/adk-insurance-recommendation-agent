# 保險推薦 Agent 技術教學文件 (Technical Tutorial)

本文件整合了本專案的核心技術架構、開發流程與營運規範，旨在幫助開發者快速上手並掌握 AI Agent 的完整生命週期管理。

---

## 1. 即時互動 (Live Mode) 實作詳解

本專案的核心特色之一是支援 **Gemini Multimodal Live API**，實現語音、文字與影像的低延遲雙向互動。

### 後端實作與串流架構
- **技術棧**：FastAPI + WebSockets + Google GenAI SDK。
- **端點**：`/api/agent/live/ws/{session_id}`。
- **認證**：由於 WebSocket 無法輕易攜帶 Header，連線時透過 Query Parameter 傳遞 JWT Token 進行驗證。
- **模式切換**：支援 `proactivity` (主動建議) 與 `affective_dialog` (同理心對話) 功能開關，這些設定會注入 Session State 中，影響 Agent 的人格特質。
- **架構設計**：關於完整的多模態語音上/下行、雙向並行調度、Web Audio Worklet 處理機制及完整的通訊時序圖，請參閱 [即時語音與 Live API 串流設計架構](./live-streaming-architecture.md)。

### 前端實作
- **多模態 Hooks**：
  - `useAudioCapture` / `useAudioPlayback`：處理音訊採樣與串流播放。
  - `useCameraCapture` / `useScreenCapture`：擷取影像幀並定時傳送。
  - `useLiveAgent`：封裝 WebSocket 通訊協定，協調多種媒體流的同步。

---

## 2. 完整環境建置與四大環境說明

本專案採用嚴格的環境隔離與 IaC (Infrastructure as Code) 管理。

| 環境名稱 | 目的 | Terraform 目錄 | 執行指令 (Makefile) |
| :--- | :--- | :--- | :--- |
| **Local** | 本地開發與單元測試 | N/A (Docker Compose) | `make playground`, `make ui-dev` |
| **Dev** | 雲端個人開發與沙盒測試 | `deployment/terraform/dev` | `make tf-apply ENV_NAME=dev` |
| **Staging** | QA 整合測試與上線前預演 | `deployment/terraform/staging` | 自動化 (Merge to `main`) |
| **Prod** | 正式營運環境 | `deployment/terraform/prod` | 自動化 (Git Tag) |

### 初始化步驟
1. **本地依賴**：`make install-all`。
2. **資料庫初始化**：`make db-reset` (啟動 Postgres + Seed + Ingest)。
3. **雲端連結**：`make tf-bootstrap` (建立 GCP 與 GitHub 連線)。

---

## 3. MCP Toolbox 實作功能

利用 **Model Context Protocol (MCP)** 將業務邏輯與 LLM 隔離，確保 Agent 動作的可控性與安全性。

### 核心工具集
- **SQL 商品搜尋**：`search_medical_products` 等工具直接查詢資料庫，並根據使用者預算回傳 `budget_fit` 標籤。
- **語義搜尋 (RAG)**：`search_faq` 工具結合 `pgvector` 與 Vertex AI Embedding，實現保險條款的智慧問答。
- **規則獲取**：`get_recommendation_rules` 讓 Agent 能動態讀取保險推薦的邏輯基準，減少幻覺。

### 配置與管理
- 工具定義位於 `db/tools.local.yaml`，方便開發者在不修改程式碼的情況下調整工具行為或描述。

---

## 4. 可觀測性 (Observability)

專案整合了 Google Cloud 原生服務，確保 AI 決策過程可追蹤、可稽核。

1. **Agent Tracing**：基於 OpenTelemetry，可在 Cloud Trace 查看 `invoke_agent` 與工具執行的細節耗時。
2. **Hash Chain Audit Log**：所有關鍵操作皆紀錄於 PostgreSQL，並透過雜湊鏈設計 (`prev_hash`) 確保稽核日誌不被竄改。
3. **BigQuery Analytics**：非同步將對話事件寫入 BigQuery，用於計算 Token 成本與分析使用者意圖。
4. **PII Redaction**：在資料傳出至日誌或 LLM 前，自動偵測並遮蔽敏感資料。

---

## 5. 測試與評估

### 自動化測試
- **單元測試**：`pytest tests/unit/`。
- **安全性測試**：`make test-security` (包含 PII 遮蔽與審計邏輯驗證)。
- **負載測試**：使用 Locust 模擬高併發場景。

### Agent 評估 (Evals)
使用 **LLM-as-a-Judge** 機制，針對不同維度進行量化評分：
- `make eval-core`：核心推薦邏輯。
- `make eval-safety`：安全性與邊界測試。
- `make eval-live`：即時互動表現。

---

## 6. 開發與部署流程

### 開發循環
1. 在本地執行 `make playground` 進行 Prompt 調優。
2. 執行 `make eval-all` 確保變更沒有造成退化。
3. 推送至 GitHub 觸發 PR 檢查 (`pr_checks.yaml`)。

### 部署流程
1. **Dev 部署**：開發者可手動執行 `make tf-apply ENV_NAME=dev` 進行快速驗證。
2. **Staging 部署**：合併 PR 至 `main` 分支後，Cloud Build 自動觸發 `staging.yaml` 管線，更新測試環境資源。
3. **Prod 部署**：管理員建立 Git Tag (如 `v1.0.0`) 後，觸發 `deploy-to-prod.yaml` 管線進行正式發布。

---
*詳細文件連結：*
- [後端設計](./backend-agent-design.md) | [前端設計](./frontend.md) | [可觀測性指南](./obs.md) | [測試策略](./testing.md) | [評估指南](./evaluation.md) | [開發執行手冊](./development-execution.md) | [即時串流架構](./live-streaming-architecture.md)
