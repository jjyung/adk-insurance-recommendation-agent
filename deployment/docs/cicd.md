# 完整 CI/CD 流程說明文件：部署 Staging 與 Production

本文件詳細說明如何建立保險建議 Agent (Insurance Recommendation Agent) 的自動化部署流水線，涵蓋從本地開發到 Staging 以及 Production 環境的完整生命週期。

---

## 1. 核心流程設計 (CI/CD Pipeline Design)

我們採用 **GitOps** 與 **環境隔離** 的策略：

1.  **CI (Continuous Integration)**: 針對所有 Pull Request 執行。
    *   任務：代碼檢查 (Linting)、單元測試 (Unit Tests)、Terraform Plan (預覽基礎架構變更)。
2.  **CD to Staging**: 當代碼合併至 `main` 分支時執行。
    *   任務：建置 Docker 映像檔、推送到 Artifact Registry、更新 Staging 環境基礎架構、執行部署後評估 (ADK Eval)。
3.  **CD to Production**: 當建立 Git Tag (例如 `v1.0.0`) 時執行。
    *   任務：將 Staging 的映像檔標記 (Tag) 為生產版本、更新 Production 環境基礎架構。

---

## 2. 前置準備 (Phase 0: Bootstrapping)

在啟動 CI/CD 之前，需確保 GCP 環境與自動化流水線基礎設施已準備就緒。

### 2.1 建立 GCP 專案
建議至少準備三個獨立專案以達成環境隔離：
*   `your-dev-project-id` (開發用)
*   `your-staging-project-id` (測試/驗收用)
*   `your-prod-project-id` (生產用)

### 2.2 部署 CI/CD 基礎架構 (Bootstrap)
我們提供了專門的 Terraform 配置與自動化腳本來建立 Cloud Build 觸發器與 GitHub 連線。此步驟通常在 `dev` 或專門的 CI/CD 專案中執行一次。

1.  **使用 Makefile 執行部署（推薦）**：
    確保 `.env` 中已設定 `GITHUB_OWNER` 與 `GITHUB_REPO_NAME`，然後執行：
    ```bash
    make tf-bootstrap
    ```
    *註：此指令會自動引導您完成 GitHub 連線建立。如果這是首次連線，終端機會暫停並提供一個授權網址。請點擊該網址完成 GitHub 授權，腳本會自動偵測授權完成並繼續執行後續的 Terraform 部署。*

2.  **手動執行部署（進階）**：
    如果你不使用 Makefile，請先執行腳本建立連線：
    ```bash
    bash scripts/setup_github_conn.sh
    ```
    完成授權後，再執行 Terraform：
    ```bash
    cd deployment/terraform/bootstrap
    terraform init
    terraform apply \
      -var="project_id=your-dev-project-id" \
      -var="github_owner=your-github-handle" \
      -var="github_repo_name=insurance-recommendation-agent-auth"
    ```

### 2.3 準備 Terraform State 儲存桶
各環境（dev, staging, prod）需要遠端儲存桶來管理狀態檔。使用 Makefile 指令快速生成配置：

```bash
# 此指令會根據 .env 設定，自動在 GCP 建立 Terraform State Bucket，並生成各環境的 .tfbackend 設定檔
make tf-gen-config
```

### 2.4 設定 Workload Identity Federation (WIF)(使用 Github action 選用)
為了讓 GitHub Actions 或其他外部工具安全連結 GCP，請參考 [wif-setup.md](./wif-setup.md) 進行設定。

---

## 3. Day 0：首次基礎設施部署與資料庫初始化

在 CI/CD 接管之前，需手動執行一次初始部署以建立必要的資源（如 Artifact Registry）。**這一步是不可省略的「冷啟動 (Cold Start)」，否則後續 CI/CD 會因缺乏資源與遠端狀態而失敗或產生重複的 Cloud SQL 實體。**

1. **設定環境變數**：
   修改 `.env` 檔案：
   ```env
   GCP_PROJECT_ID=your-staging-project-id
   ENV_NAME=staging
   ```

2. **建立遠端狀態儲存桶 (極重要)**：
   **務必執行此步驟**，確保本地與未來的 Cloud Build 使用相同的 Terraform 狀態，防止重複建立資料庫：
   ```bash
   make tf-gen-config
   ```

3. **建置並推送初始映像檔**：
   ```bash
   make build-push
   ```

4. **初始化並部署基礎架構**：
   這會自動讀取步驟 2 建立的遠端配置：
   ```bash
   make tf-init
   make tf-apply
   ```

5. **初始化資料庫結構 (Schema & Seed)**：
   我們透過 Cloud Run Job 或本地指令進行初始化：
   ```bash
   # 使用 Makefile 執行資料庫初始化
   make gcp-db-setup
   ```

> **學習與排障提示**：如果因操作失誤（如未同步狀態檔）導致 GCP 上產生了多個名稱類似的 Cloud SQL 實體，可使用 `make gcp-cleanup-orphans` 指令協助列出並清理多餘的資源。

---

## 4. 持續整合：Pull Request (CI)

當開發者提交 PR 時，Cloud Build 會自動觸發 `.cloudbuild/pr_checks.yaml`。

### 主要任務：
1.  **Lint & Test**: 執行 `make lint` 與 `make test`。
2.  **IaC Plan**: 在 `deployment/terraform/staging` 執行 `terraform plan`，確保基礎架構變更安全。

---

## 5. 部署至 Staging 環境 (CD-Staging)

合併至 `main` 時，觸發 `.cloudbuild/staging.yaml`：
1.  **Image Build**: 以 Commit SHA 為版本建置映像檔。
2.  **TF Apply**: 更新 Staging 環境資源。
3.  **ADK Eval**: 自動執行 `make eval-all` 進行 AI 品質驗證。

---

## 6. 部署至 Production 環境 (CD-Prod)

建立 Git Tag 時，觸發 `.cloudbuild/deploy-to-prod.yaml`：
1.  **Image Promotion**: 將 Staging 映像檔標記為 `prod-latest`。
2.  **TF Apply**: 更新生產環境（`deployment/terraform/prod`），此環境預設開啟 **High Availability** (例如：更高等級的 DB Tier 與開啟 Deletion Protection)。

---

## 7. 維運與管理

### 7.1 秘密管理 (Secret Management)
*   DB 密碼與 API Keys 儲存在 **GCP Secret Manager**。
*   Terraform 自動生成的密碼會同步寫入 Secret，並授權給 Cloud Run 服務。

### 7.2 資料庫遷移 (DB Migration)
*   基礎架構包含一個 **Cloud Run Job** (`db-migration`)。
*   Schema 變更後，可透過 Console 執行該 Job 或使用 `make gcp-db-setup` 同步雲端資料庫結構。

---

## 8. 開發者檢查清單

1.  [ ] `.env` 已正確設定 `ENV_NAME`。
2.  [ ] 已執行 `make tf-gen-config` 生成 backend 配置。
3.  [ ] 已執行 `make tf-bootstrap` (或手動) 建立 CI/CD 觸發器。
4.  [ ] 本地測試通過：`make test` 與 `make eval`。

> **注意**: 在 Production 環境執行 `terraform destroy` 前請務必備份資料，這是一個破壞性極高的操作。
