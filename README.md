# 保險推薦代理 (Insurance Recommendation Agent)

這是一個以 Google ADK、MCP (Model Context Protocol) Toolbox for Databases、FastAPI、SQLite/PostgreSQL 與 Vertex AI (Gemini 3.x/1.5 Models) 建立的高階保險推薦代理原型專案。

目前專案的核心設計是：

- 由 **ADK Agent** 負責對話流程、主動追問、工具選擇、決策推理與最終合規回覆整合。
- 由 **MCP Toolbox (Sidecar 模式)** 載入 `db/tools.yaml`，提供受控的 SQL 查詢與 FAQ 向量檢索工具，嚴格隔離資料庫邏輯。
- 由 **FastAPI** 提供高效能、低延遲的後端 API，支援標準 REST、SSE (Server-Sent Events) 與全雙工非同步 WebSocket 雙向語音/影像串流。
- 由 **PostgreSQL/SQLite** 儲存商品、推薦規則、FAQ 語意資料、稽核日誌與對話工作階段。
- 具備 **多模態即時對話 (Live Mode)**，配合 Web Audio Worklet 與影像智能縮放，提供毫秒級的音訊與影像即時互動。
- 具備 **軍規級安全性防護**，包含 PII 個人資訊即時脫敏、SHA-256 雜湊鏈鏈結的防篡改稽核日誌 (Audit Log)、以及去敏感的前端狀態過濾。
- 具備 **全方位的可觀測性 (Observability)**，整合 OpenTelemetry 追蹤、BigQuery Analytics 分析插件與 Cloud Logging / GCS。
- 透過 **Google ADK Evals 自動化框架**，利用 LLM-as-a-Judge 技術對 Agent 進行 5 大維度的量化回歸評估與優化。
- 透過 **Makefile** 統一管理本地開發、多環境部署 (Terraform Dev/Staging/Prod)、測試與評估。

本專案聚焦在「高可追溯、可信賴、安全受控」的保險科技 (InsurTech) 推薦流程與對話體驗，展現如何使用最新的生成式 AI 與 Agent 技術建構生產級的智慧代理系統。

---

## 專案核心目標與商業場景

1. **精準追問與需求釐清 (Proactive Clarification)**：當使用者輸入的需求不足（如未提供年齡、保障目標、保費預算）時，Agent 能夠在多輪對話中，依據引導策略主動、自然地進行精準追問，不進行盲目推薦。
2. **受控且安全的資料庫查詢 (Controlled Database Query)**：透過 MCP Toolbox 執行嚴格受控制的 SQL Templates，避免 LLM 自由生成 SQL 語法導致的 SQL Injection 漏洞、資料庫負載過高或幻覺產生的錯誤推薦。
3. **向量 FAQ 檢索與保險知識庫 (RAG Semantic Search)**：整合 RAG 檢索，使 Agent 能即時回答繁雜的保險條款與除外責任，並自動給予免責聲明與等待期提醒。
4. **多模態語音/影像即時互動 (Multimodal Live Stream)**：支援全雙工 WebSocket 串流，能即時分析客戶說話語音與上傳的圖片（如健保卡或他家保單），極大化延伸至即時智慧客服、行動理賠等情境。
5. **不可篡改的安全稽核與 PII 脫敏 (Security & Compliance)**：在數據進出 LLM 及 Audit Log 前，即時識別並脫敏 Email、電話、身分證等個人資訊；日誌採用雜湊鏈加密，確保存證能完整被核。
6. **嚴謹的 AI 回歸評估 (Evaluation-Driven Development)**：內建多套測試集 (Evalsets)，將評估融入開發循環，確保 Prompt 調優與工具增減不會造成系統能力衰退。

---

## 系統架構設計

### 系統架構圖 (System Architecture)

![arch](docs/images/archi-v2.png)
*(系統架構包含前端 ADK Workbench、後端 FastAPI 服務、MCP Toolbox 以及 Vertex AI 模型端)*

### 功能設計圖 (Feature Design)

![features](docs/images/features.png)
*(功能涵蓋對話狀態管理、安全性稽核、多模態串流處理與保險知識檢索)*

### 後端責任分工與模組職責

- **`app/api` (API 路由與介面層)**：FastAPI 邊界，負責 REST routes、SSE/WebSocket 串流、Request/Response Mappers 以及依賴注入綁定。
- **`app/services` (業務邏輯服務層)**：封裝核心業務邏輯，包含：
  - `AgentRunService`：處理標準對話執行、多輪歷史記錄與 Plugin 掛載。
  - `LiveAgentService`：處理 WebSocket 全雙工即時串流 (Bidi-streaming)，協調上/下游非同步任務。
  - `AuditLogService`：處理防篡改稽核日誌，實作 SHA-256 鏈結。
  - `SessionService`：管理多輪對話與結構化 Session State 的存儲。
- **`app/agent.py` (Agent 定義層)**：Google ADK Agent 組裝入口，定義系統提示詞 (`prompts/insurance_agent_prompt.txt`)、組件配置與 MCP 工具集。
- **`app/container.py` (依賴注入容器)**：DI Container，集中管理 Config、Agent Runner、Session Store 與各服務的生命週期。
- **`app/security` (安全防護層)**：處理 PII 偵測與脫敏 (Redaction)，以及狀態物件中的敏感資訊過濾 (`Public State Filter`)。
- **`app/tools` (本地工具層)**：提供本地 Session State Tools，讓 Agent 能在多輪對話中讀寫結構化客戶狀態（如 User Profile）。
- **`app/streaming` (串流處理)**：專門處理 Upstream (客戶端到後端) 與 Downstream (後端到客戶端) 的資料流轉換。

---

## 關鍵技術特性與實作詳解

### 1. 安全性與隱私保護 (Security & Compliance)
- **PII Redaction (個人資訊脫敏)**：實作於 `app/security/pii.py`。自動偵測並遮蔽對話、工具呼叫及日誌中的身分證字號、手機、Email 與信用卡號。
- **Audit Logging & Hash Chain (防篡改稽核日誌)**：實作於 `app/services/audit_log_service.py`。每個事件日誌均會計算並存入前一個事件的雜湊值 (`prev_hash`)。一旦中途日誌被篡改或刪除，雜湊鏈條即會中斷，確保存證完整性。
- **State Filtering (狀態過濾)**：在傳回前端的狀態更新中，自動過濾並隱藏敏感資訊與內部執行細節，只將安全的 Public State 呈現給用戶。
- **認證與授權分離 (Auth Isolation)**：
  - 前端 (Next.js) 採用 `NEXTAUTH_SECRET` 加密 Session Cookie 與前端 JWT。
  - 後端 (FastAPI) 採用 `JWT_SECRET` 簽發 Access Token。
  - 雙端認證協作流程如下：
  ```mermaid
  sequenceDiagram
      participant User as 使用者 (Browser)
      participant NextAuth as NextAuth.js (Frontend)
      participant Backend as FastAPI (Backend)

      Note over User, Backend: 1. 登入階段
      User->>NextAuth: 輸入帳號密碼 (POST /api/auth/signin)
      NextAuth->>Backend: 轉發憑證 (POST /auth/token)

      Note right of Backend: 使用 [JWT_SECRET] <br/>簽署 Access Token
      Backend-->>NextAuth: 回傳 access_token

      Note left of NextAuth: 使用 [NEXTAUTH_SECRET] <br/>加密 Session 並儲存 access_token
      NextAuth-->>User: 設定加密的 Session Cookie

      Note over User, Backend: 2. API 請求階段
      User->>NextAuth: 瀏覽受保護頁面 / 發起 API 請求
      Note left of NextAuth: 使用 [NEXTAUTH_SECRET] <br/>解碼 Cookie 取得 access_token

      NextAuth->>Backend: 帶入 Authorization: Bearer {access_token}
      Note right of Backend: 使用 [JWT_SECRET] <br/>驗證 Token 合法性

      Backend-->>NextAuth: 回傳 API 資料
      NextAuth-->>User: 渲染頁面與資料
  ```

### 2. 多模態即時語音對話 (Multimodal Live Agent)
專案整合了 **Google ADK Multimodal Live API**，實現語音、文字與影像的低延遲全雙工互動：
- **串流端點**：`/api/agent/live/ws/{session_id}`。連線時，前端將 JWT 權杖做為 Query Parameter 帶入，並傳入 `proactivity` 與 `affective_dialog` 等特徵旗標。
- **並行任務調度**：`LiveAgentService.execute_live_session` 啟動 `upstream_task` 與 `downstream_task`，並透過 `asyncio.wait(..., return_when=asyncio.FIRST_EXCEPTION)` 監控，任一端斷線或異常，即自動觸發資源回收。
- **上行流處理 (Upstream Flow)**：
  - 前端 Web Audio Worklet 擷取 16k Hz 麥克風音訊，轉成 Int16 PCM 二進位流。
  - 視訊鏡頭影格與螢幕截圖會在前端定時擷取。
  - 後端 `upstream_task` 接收後，會先進行 **影像優化與等比例縮放**（等比例將寬度限制在 1024 像素內，轉成低頻寬 JPEG 格式），接著以 `types.Blob` 送入 `LiveRequestQueue`。
- **下游流處理 (Downstream Flow)**：
  - `downstream_task` 調用 ADK 的 `runner.run_live()` 啟動 Gemini Live Session。
  - 解析傳回的音訊 PCM 片段、文字轉錄 (Transcriptions) 與工具呼叫。
  - 遇到安全管制（`SAFETY`）或配額耗盡（`RESOURCE_EXHAUSTED`）等致命錯誤碼時，能即時切斷並向前端回報安全邊界警告。
  - 前端接收到音訊二進位流後，經由 24k Hz 播放 Worklet 注入 Ring Buffer 平滑輸出。
  ```mermaid
  sequenceDiagram
      autonumber
      actor Client as Client (前端)
      participant EP as live.py<br/>(FastAPI Endpoint)
      participant LS as LiveAgentService
      participant UT as upstream_task<br/>(Upstream Task)
      participant DT as downstream_task<br/>(Downstream Task)
      participant LQ as LiveRequestQueue
      participant Runner as ADK Runner<br/>(Gemini Live API)

      Client->>EP: WebSocket 升級請求 (帶入 token & session_id)
      activate EP
      EP->>EP: decode_access_token() 手動驗證 JWT
      EP-->>Client: websocket.accept() (接受連線)
      EP->>EP: 更新 Session 狀態 (proactivity/affective 旗標)

      EP->>LS: execute_live_session()
      deactivate EP
      activate LS
      LS->>LS: create_run_config() (配置音訊/繁中/TTS)
      LS->>LQ: 建立 LiveRequestQueue()
      LS->>LS: ensure_session() (確保資料庫會話紀錄)

      rect rgb(240, 248, 255)
          LS->>UT: asyncio.create_task(upstream_task)
          activate UT
          LS->>DT: asyncio.create_task(downstream_task)
          activate DT
      end
      deactivate LS

      loop 雙向互動 (上游)
          Client->>UT: 發送音訊 PCM Bytes / 圖片 / 文字 / 影格
          UT->>LQ: send_realtime(audio_blob) / send_content(content)
          LQ-->>Runner: 資料流傳輸至 Live API
      end

      DT->>Runner: 執行 runner.run_live(live_request_queue)
      loop 雙向互動 (下游)
          Runner-->>DT: 迭代事件 event (音訊 PCM, 轉錄文字, 工具呼叫)
          DT->>Client: event_json (序列化並發送至前端)
      end
  ```

### 3. MCP Toolbox 與 RAG 保險條款語意搜尋
本專案利用 MCP 概念，將資料庫與外部 API 的複雜邏輯與 LLM 本體進行物理隔離：
- **受控 SQL 工具**：`search_medical_products`、`search_accident_products` 等工具直接在 SQLite/PostgreSQL 資料庫執行，根據年齡、預算篩選，自動回傳標有 `budget_fit` 的受控 JSON。
- **RAG FAQ 語意檢索**：
  - **資料結構**：原始文本存放於 `faq_knowledge`。當執行 `scripts/ingest_faq_embeddings.py` 時，調用 Vertex AI `text-embedding-004` (768 維) 將問答編碼，並寫入向量虛擬表 `vec_faq_knowledge` 中。
  - **KNN 檢索流程**：當 Agent 調用 `search_faq_knowledge` 工具時，MCP 伺服器會攔截參數，先將查詢文字編碼為向量，再於資料庫執行 KNN (Cosine/L2 distance) 相似度比對，回傳最相關的 Top-3 問答。這能完美阻絕 SQL 注入攻擊，並避免模型幻覺。
  ```mermaid
  sequenceDiagram
      autonumber
      actor User as 使用者 (User)
      participant Agent as 推薦智能體 (Agent)
      participant Toolbox as Toolbox (MCP Server)
      participant VertexAI as Vertex AI (Embedding API)
      participant DB as SQLite (sqlite-vec)

      User->>Agent: 提問：「醫療險跟意外險有什麼差別？」
      Agent->>Agent: 判斷需要查詢保險知識庫

      Agent->>Toolbox: 呼叫工具 search_faq_knowledge<br>(query_text="醫療險跟意外險有什麼差別？")

      Toolbox->>VertexAI: 攔截參數 `query_text`<br>請求轉換為 Vector Embedding
      VertexAI-->>Toolbox: 回傳 768 維度向量 [0.012, -0.053, ...]

      Toolbox->>DB: 執行 SQL 查詢<br>傳入生成的向量作為 MATCH 參數

      Note over DB: 步驟 1: 在 vec_faq_knowledge 中<br>計算向量距離 (KNN Search)
      Note over DB: 步驟 2: 透過 faq_id JOIN 原表<br>faq_knowledge 取得具體文字內容

      DB-->>Toolbox: 回傳最符合 the Top-3 問答 (包含 distance 距離分數)

      Toolbox-->>Agent: 回傳 JSON 格式的檢索結果

      Agent->>Agent: 總結檢索到的 FAQ 內容
      Agent-->>User: 回答：「意外險主要針對突發意外事故...醫療險則是...」
  ```

### 4. 系統可觀測性 (System Observability)
生產級的 Agent 系統必須提供極高的決策透明度，專案整合了多層次觀測架構：
- **Agent Tracing (OpenTelemetry)**：追蹤 ADK `invoke_agent`、`generate_content` 等核心流程耗時。在 `app/tools/session_tools.py` 中，我們透過 `@tracer.start_as_current_span` 裝飾器為本地會話工具（如 `save_user_profile`、`save_last_recommendation`）加入了自定義 Trace Spans，精確度量地端/雲端協作耗時。
- **BigQuery Agent Analytics (深度分析)**：載入 `BigQueryAgentAnalyticsPlugin` 插件，非同步且結構化地將對話的每個 Turn（包含 `LLM_REQUEST`、`LLM_RESPONSE`、`TOOL_COMPLETED` 等事件）寫入 BigQuery，實現成本加總、工具效能聚合分析、異常自動偵測。
- **結構化日誌 (Cloud Logging & GCS)**：可透過設定 `LOGS_BUCKET_NAME` 將模型的完整輸入輸出以 JSONL 格式備份至 GCS。本地開發時可觀測性會 **優雅降級 (Graceful Degradation)**，不影響本地效能。

### 5. 容器化與 DevOps 多環境隔離 (Multi-Environment IaC)
- **Dockerfile 構建優化**：後端服務使用 `uv` 構建 Multi-stage Docker Image（`Dockerfile.backend`），縮小 Image 大小並加快啟動速度。
- **Cloud Run Sidecar 模式**：在生產/雲端環境中，我們使用 Cloud Run Sidecar 模式，將 `Backend` 容器與 `Toolbox` 容器部署在同一個 Cloud Run 服務中。它們共享 localhost 網絡通訊，保證了 MCP 工具的安全隔離。
- **Terraform 隔離環境**：
  - **Local**：Docker Compose 地端沙盒。
  - **Dev**：個人快速測試與雲端沙盒 (`deployment/terraform/dev`)。
  - **Staging**：分支合併至 `main` 時自動構建與整合測試 (`deployment/terraform/staging`)。
  - **Prod**：正式營運環境，基於 Git Tag 觸發自動化管線 (`deployment/terraform/prod`)。

---

## 專案目錄結構 (Project Directory Structure)

```text
insurance-recommendation-agent/
├── Makefile                    # 常用指令集 (安裝、測試、啟動、部署、評估)
├── README.md                   # 專案總覽說明文件 (本文件)
├── pyproject.toml              # 專案套件依賴與設定 (使用 uv)
├── uv.lock                     # uv 依賴鎖定檔
├── docker-compose.yml          # 本地容器化資料庫與 Toolbox 服務配置
├── Dockerfile.backend          # 後端 API 服務的多階段構建 Dockerfile
├── Dockerfile.toolbox          # MCP Toolbox 服務的 Dockerfile
├── GEMINI.md                   # 專案 Coding Agent 規範指南
├── app/                        # 後端核心程式碼
│   ├── api/                    # FastAPI 路由、Middleware 與 Schema 定義
│   │   ├── routes/             # REST, SSE & WebSocket 串流路由 (live.py, run.py)
│   │   ├── dependencies.py     # 依賴注入綁定
│   │   └── main.py             # FastAPI 啟動入口
│   ├── app_utils/              # 遙測與部署輔助工具 (telemetry.py)
│   ├── security/               # PII 脫敏與安全邏輯 (pii.py, auth.py)
│   ├── services/               # 業務邏輯服務層 (AgentRun, LiveAgent, AuditLog, Session)
│   ├── tools/                  # 本地 Session Tools 與輔助工具 (session_tools.py)
│   ├── streaming/              # WebSocket 串流雙向處理邏輯 (upstream.py, downstream.py)
│   ├── agent.py                # Agent 核心設定、提示詞與工具掛載
│   └── container.py            # 依賴注入容器 (DI Container)
├── db/                         # 資料庫與工具定義
│   ├── schema.sql              # 保險商品、規則與 FAQ 的 SQLite/Postgres Schema
│   ├── seed.sql                # 初始示範測試資料
│   ├── audit_schema.sql        # 稽核日誌資料表 Schema
│   ├── tools.local.yaml        # 本地 MCP 工具定義 (定義 SQL 模板與參數)
│   └── tools.cloud.yaml        # 雲端 MCP 工具定義 (適用於 Sidecar 部署)
├── deployment/                 # 部署與 IaC (Terraform, Shell scripts)
│   ├── docs/                   # 部署與 CI/CD 設定說明文件
│   └── terraform/              # Terraform 各環境設定 (dev, staging, prod, modules, bootstrap)
├── docs/                       # 設計文件與架構圖
│   ├── features/               # 詳細功能設計文件 (Backend, Frontend, Live Mode, Obs, Evals, etc.)
│   └── images/                 # 架構圖與功能圖
├── frontend/                   # Next.js 前端 (功能完備的 ADK Workbench)
│   ├── app/                    # 頁面與 API 路由 (Live 互動控制台)
│   ├── components/             # UI 元件 (WaveformVisualizer, StateTree, TimelineNodes)
│   └── hooks/                  # 自定義多模態 Hooks (useLiveAgent, useAudioCapture)
├── scripts/                    # 輔助腳本 (FAQ Embeddings 匯入、Seed User 建立)
└── tests/                      # 測試與自動化評估
    ├── api/                    # 系統整合測試
    ├── unit/                   # 核心模組單元測試 (session, auth, user, tools)
    ├── security/               # 安全性與隱私保護功能單元測試 (pii, audit log)
    ├── load_test/              # Locust 負載測試
    └── eval/                   # ADK Eval 自動化評估 (核心, 擴展, Live, 安全, Session-aware)
```

---

## 完整指令對照指南 (Makefile Command Reference)

以下彙整了 `Makefile` 中可用於不同開發階段的所有快捷指令，便於快速查閱與呼叫。

### 1. 開發環境準備 (Environment Setup)

| 指令 | 說明 | 備註 |
| :--- | :--- | :--- |
| `make help` | 列出所有可用指令及其簡短說明 | |
| `make install` | 建立 Python 3.12 虛擬環境並安裝**核心**依賴 | 第一次設置時使用 |
| `make install-all` | 建立虛擬環境並安裝**所有**依賴 (含 dev, eval, gcp) | 推薦完整開發與評估時使用 |
| `make sync` | 同步核心依賴 | 已有 `.venv` 時更新使用 |
| `make sync-all` | 同步所有依賴 | |
| `make env-check` | 檢查必要本地工具 (uv, docker) 與 `.env` 變數 | |
| `make playground` | 啟動互動式 Playground 進行測試 | ADK 內建 Web UI (Streamlit) |

### 2. 資料庫管理 (Database Management)

| 指令 | 說明 | 備註 |
| :--- | :--- | :--- |
| `make db-init` | 啟動本地資料庫，初始化保險 Schema, 種子資料與稽核 Schema | |
| `make db-seed` | 建立測試使用者與基礎資料 | |
| `make db-ingest` | 執行 FAQ 知識庫的向量嵌入與匯入 (scripts/ingest_faq_embeddings.py) | 需配置 .env Vertex AI 憑證 |
| `make db-reset` | 刪除並重建所有本地資料庫檔案 | 一鍵重置 (會清除所有現有資料) |
| `make clean-db` | 僅清除資料庫檔案 (`.db`) | |

### 3. 本地運行與開發 (Local Development & Execution)

| 指令 | 說明 | 預設位址/埠 |
| :--- | :--- | :--- |
| `make run-fastapi` | 啟動 FastAPI backend 伺服器 (支援熱重載) | `http://localhost:8080` |
| `make debug-fastapi` | 啟動具有 VS Code 偵錯 (`debugpy`) 支援的後端 | 埠 `5678` |
| `make ui-install` | 安裝前端 Next.js 依賴套件 | |
| `make ui-dev` | 啟動 Next.js 模擬前端 UI (ADK Workbench) | `http://localhost:3000` |
| `make run-web` | 以 ADK 內建 Web UI 啟動 Agent | 埠 `8000` |
| `make run-cli` | 以 CLI 互動對話模式啟動 Agent | 終端機直接輸入 |

### 4. 測試與安全性驗證 (Testing & Security Verification)

| 指令 | 說明 |
| :--- | :--- |
| `make check` | 執行所有 Python 單元與整合測試 (pytest) |
| `make test-api` | 專門執行 FastAPI API 路由相關整合測試 |
| `make test-security` | 執行安全性 (PII 脫敏、Public State Filter) 的單元測試 |
| `make test-audit` | 驗證防篡改雜湊鏈 Audit Log 儲存與驗證邏輯 |

### 5. 容器化工具 (Containerized Services)

| 指令 | 說明 |
| :--- | :--- |
| `make up` | 啟動本地所有 Sidecar 服務 (SQLite, db, toolbox) (背景執行) |
| `make up-build` | 強制重建並啟動本地 Sidecar 服務 (背景執行) |
| `make down` | 停止並移除所有 Docker Compose 容器與網絡 |
| `make logs` | 查看本地容器的即時日誌 |

### 6. 雲端部署 (Cloud Deployment)

#### Terraform IaC
| 指令 | 說明 |
| :--- | :--- |
| `make tf-gen-config` | 根據環境變數自動生成 Terraform Backend 遠端狀態配置檔 (`.tfbackend`) |
| `make tf-init ENV_NAME=dev` | 初始化 dev 環境的 Terraform 工作區 |
| `make tf-plan ENV_NAME=dev` | 預覽 dev 環境的雲端資源變更 |
| `make tf-apply ENV_NAME=dev` | 部署 dev 環境資源到 GCP (建立 Cloud Run, SQL, Secret) |
| `make tf-destroy ENV_NAME=dev` | 銷毀 dev 環境的所有雲端資源 (請謹慎使用) |

#### GCP 輔助與流量管理
| 指令 | 說明 |
| :--- | :--- |
| `make build-push` | 建置 Docker 映像檔並推送到 GCP Artifact Registry |
| `make gcp-deploy` | 一鍵執行完整部署流程 (Build + Push + CLI Deploy) |
| `make gcp-traffic-list` | 查看 Cloud Run 目前的流量分配與版本名稱 |
| `make gcp-rollback` | 將 Cloud Run 的流量一鍵退回到上一個穩定版本 |
| `make gcp-canary` | 設定 Canary 漸進式流量 (參數: `REV=[版本名] PER=[百分比]`) |

### 7. 清理與維護 (Clean up)

| 指令 | 說明 |
| :--- | :--- |
| `make clean` | 清除 Python 編譯快取與測試暫存檔 (`__pycache__`, `.pytest_cache`) |
| `make clean-sessions` | 清除本地 ADK 的對話工作階段 (Session DB) |
| `make clean-all` | **極致清理**：包含快取、本地資料庫、Session 資料及 `.venv` 虛擬環境 |

---

## 測試與評估機制 (Testing & Evaluations)

### 1. 自動化回歸評估 (ADK Evals & LLM-as-a-Judge)
傳統的單元測試難以驗證大語言模型的生成品質、意圖理解與工具呼叫順序。本專案使用 Google ADK 內建的 **Evals 框架**。
- **評估流程**：
  1. 在 `tests/eval/configs/test_config.json` 設定評判標準與 Judges (例如 `gemini-1.5-pro` 作為裁判)。
  2. 在 `tests/eval/evalsets/` 下的多個目錄，定義測試案例（包含 user input 與 golden output / expected tools）。
  3. 呼叫 `adk eval` 或 `make` 批量執行，產出 `eval_results.json` 並匯總評分與反饋，用於 Prompt 工程與工具微調。
- **5 大評估維度與指令**：
  - **核心流程 (Core)**：`make eval-core`
    - 驗證基礎保單推薦、資訊不足時追問與商品規則匹配。
  - **擴展情境 (Extended)**：`make eval-extended`
    - 驗證預算極低、特定高危職業、或完全無合適匹配商品時的處理邏輯。
  - **安全性與合規 (Safety)**：`make eval-safety`
    - 驗證 Agent 不洩漏 PII、不虛假承諾回報率、遵守免責邊界及避免偏激言論。
  - **會話感知 (Session-Aware)**：`make eval-session-aware`
    - 驗證 Agent 跨輪對話中，是否能重複讀取、更新並引用已記錄的 User Profile 與歷史推薦。
  - **即時互動 (Live)**：`make eval-live`
    - 驗證在低延遲 Live WebSocket 語音對話下的同理心對話、情緒反應與主動打斷。
- **全域評估**：
  - 執行 `make eval-all` 遍歷所有測試集並產出完整報告。

### 2. 安全性單元測試
執行 `pytest tests/security`，對 PII 偵測與脫敏、前端 Public State Filter、以及 Audit Log SHA-256 雜湊鏈進行極限驗證。

---

## 推薦與執行流程摘要

```text
  [ 使用者提問 ]
         │
         ▼
 1. [ PII 即時脫敏 ] ─────────────────► 2. [ 結構化 Session 載入 ]
         │                                       │
         ▼                                       ▼
 3. [ 系統提示詞引導 ] ◄───────────────── 4. [ 決策推理與判斷 ]
         │ (判斷資訊是否充足？)
         ├─────────────────── 不足 (缺失年齡/預算)
         │                     │
         ▼                     ▼
 5. [ 呼叫 MCP SQL/RAG 工具 ]    [ 引導追問策略 / 免責聲明 ]
         │ (資料庫受控查詢)            │
         ▼                            ▼
 6. [ 商品規則匹配與分析 ]        [ 生成最終對話回應 ]
         │                            │
         ▼                            ▼
 7. [ 雜湊鏈 Audit Log 紀錄 ]     [ PII 脫敏 & 狀態過濾 ]
         │                            │
         ▼                            ▼
  [ 儲存 Session 狀態 ]          [ 前端 WebSocket/REST 渲染 ]
```

---

## 免責聲明

本專案僅用於原型設計、AI 技術展示、學術研究與雲端系統架構示範。所有保險推薦結果、規則、商品條款與保費計算皆為虛構 or 僅供初步參考，**不可直接用於真實金融或保險業務**。實際投保與保險諮詢仍需以保險公司官方商品說明、要保書、健康告知書與保險公司核保結果為準。
