# 保險建議 Agent 部署架構總覽 (update)

本文件總結了保險建議 Agent (Insurance Recommendation Agent) 從本地開發到正式上線的完整部署生命週期，包含自動化流程時序圖與部署服務清單。

## 1. 端到端部署流程時序圖 (End-to-End Deployment Flow)

以下流程圖展示了從開發者提交程式碼，到自動化 CI/CD 流水線接手，最終完成 GCP 環境建置與資料庫初始化的完整過程。

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Developer
    participant Git as GitHub (Repo)
    participant CB as Cloud Build (CI/CD)
    participant AR as Artifact Registry
    participant TF as Terraform (IaC)
    participant GCP as GCP Resources (Cloud Run, SQL)
    participant DB as Cloud SQL (PostgreSQL)

    %% Day 0: Bootstrap Environment (Dev/Staging/Prod Initial Setup)
    rect rgb(240, 248, 255)
        note right of Dev: Phase 0: Day 0 Bootstrap (首次環境建立)
        Dev->>TF: 執行 make tf-gen-config
        TF-->>GCP: 建立 Terraform State GCS Bucket
        Dev->>CB: 執行 make build-push
        CB->>AR: 自動建立儲存庫並推送 Backend/Frontend Image
        Dev->>TF: 執行 make tf-apply (基於 ENV_NAME)
        TF->>GCP: 部署 Cloud Run, Cloud SQL, BigQuery 等基礎設施
        Dev->>DB: 執行 make gcp-db-setup
        DB-->>DB: 建立 Schema、寫入 Seed Data、完成 FAQ 向量化
    end

    %% Phase 1: Continuous Integration (PR)
    rect rgb(245, 245, 245)
        note right of Dev: Phase 1: Continuous Integration (PR 階段)
        Dev->>Git: 開啟 Pull Request
        Git->>CB: 觸發 pr_checks.yaml
        CB-->>CB: 執行代碼檢查 (make lint)
        CB-->>CB: 執行單元測試 (make test)
        CB->>TF: 執行 terraform plan (預覽變更)
        TF-->>CB: 回報基礎設施變更預覽
        CB-->>Git: 狀態回報 (Pass/Fail)
    end

    %% Phase 2: Continuous Deployment to Staging
    rect rgb(255, 250, 240)
        note right of Dev: Phase 2: CD to Staging (合併至 main)
        Dev->>Git: 合併 PR 至 main
        Git->>CB: 觸發 staging.yaml
        CB->>AR: 建置並推送新版 Image (Tag: SHA)
        CB->>TF: 執行 terraform apply (針對 Staging)
        TF->>GCP: 更新 Staging Cloud Run 服務
        CB-->>CB: 執行部署後評估 (make eval-all)
    end

    %% Phase 3: Continuous Deployment to Production
    rect rgb(255, 240, 245)
        note right of Dev: Phase 3: CD to Production (發布版本)
        Dev->>Git: 建立 Git Tag (e.g., v1.0.0)
        Git->>CB: 觸發 deploy-to-prod.yaml
        CB->>AR: 晉升映像檔 (Promote Image: Staging -> Prod Latest)
        CB->>TF: 執行 terraform apply (針對 Prod)
        TF->>GCP: 更新 Production Cloud Run 服務
    end
```

## 2. 部署服務與架構清單 (Deployed Services Summary)

透過上述自動化流程與 Terraform，系統會在 GCP 環境中配置以下核心服務：

| 領域 (Domain) | 部署資源 / 服務名稱 | 說明與用途 |
| :--- | :--- | :--- |
| **運算 (Compute)** | Cloud Run (Backend) | 負責處理核心 Agent 邏輯與 API 請求。採用 **Sidecar 雙容器架構**，同時運行主程式與 Toolbox 容器。 |
| **運算 (Compute)** | Cloud Run (Frontend) | 運行獨立的 Next.js 前端應用程式，提供使用者互動介面。 |
| **資料庫 (Data)** | Cloud SQL (PostgreSQL 15) | 關聯式資料庫。負責儲存使用者資料、保險產品規則，以及透過 pgvector 擴充儲存 FAQ 知識庫的向量資料。 |
| **儲存 (Storage)** | Artifact Registry | Docker 映像檔的儲存庫。存放 Backend、Frontend 與 Toolbox 的容器映像檔。 |
| **儲存 (Storage)** | Cloud Storage (GCS) | 包含三個主要 Bucket：<br>1. Terraform State Bucket。<br>2. Telemetry Payload Bucket (存放完整 Prompt/Response 的 JSONL)。<br>3. Cloud Build Logs Bucket。 |
| **資安 (Security)** | Secret Manager | 安全儲存敏感資訊，包含資料庫密碼 (`insurance-agent-db-password-*`) 與外部 API Keys。 |
| **資安 (Security)** | IAM & WIF | 配置 Workload Identity Federation (WIF) 供 GitHub Actions/Cloud Build 無金鑰安全存取 GCP；並配置特定的 Service Accounts 遵循最小權限原則。 |
| **遙測與監控 (Telemetry)**| Cloud Logging | 負責收集應用程式運行的日誌與 Agent 呼叫的 Metadata (延遲、Token 消耗等)。 |
| **遙測與監控 (Telemetry)**| BigQuery | 分析中樞。包含 Linked Dataset (直接查詢 Logging) 以及外部資料表 (查詢 GCS JSONL)，並透過 `completions_view` 進行資料整併與分析。 |

> **開發工具提示**：若在學習過程中頻繁建置/刪除導致產生多餘的孤兒資料庫實體，可使用 `make gcp-cleanup-orphans` 指令協助列出與清理。