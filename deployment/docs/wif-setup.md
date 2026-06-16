# Workload Identity Federation (WIF) Setup Guide

本指南說明如何設定 Google Cloud Workload Identity Federation (WIF)，讓 GitHub Actions 或 Cloud Build 能夠在不使用服務帳戶金鑰的情況下，安全地存取 GCP 資源。

## 1. 建立 Workload Identity Pool

首先，在 CI/CD 主專案（通常是 Production 或獨立的 CI 專案）中建立 Pool。

```bash
gcloud iam workload-identity-pools create "github-pool" \
    --project="YOUR_PROJECT_ID" \
    --location="us-central1" \
    --display-name="GitHub Pool"
```

## 2. 建立 OIDC Provider

為 GitHub 建立 Provider。

```bash
gcloud iam workload-identity-pools providers create-oidc "github-provider" \
    --project="YOUR_PROJECT_ID" \
    --location="global" \
    --workload-identity-pool="github-pool" \
    --display-name="GitHub Provider" \
    --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
    --issuer-uri="https://token.actions.githubusercontent.com"
```

## 3. 綁定服務帳戶

將 CI/CD Runner 服務帳戶 (`cicd_runner_sa`) 綁定到該身分。

```bash
# 允許特定儲存庫的身分模擬該服務帳戶
gcloud iam service-accounts add-iam-policy-binding "cicd-runner@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --project="YOUR_PROJECT_ID" \
    --role="roles/iam.workloadIdentityUser" \
    --member="principalSet://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/attribute.repository/YOUR_ORG/YOUR_REPO"
```

## 4. 在 Cloud Build / GitHub Actions 中使用

### GitHub Actions 範例
```yaml
- auth:
    workload_identity_provider: 'projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/providers/github-provider'
    service_account: 'cicd-runner@YOUR_PROJECT_ID.iam.gserviceaccount.com'
```

### Cloud Build 備註
若使用 Google Cloud Build，預設已整合 GCP 內部身分。若需跨專案部署，請確保 Cloud Build 服務帳戶 (`service-PROJECT_NUMBER@gcp-sa-cloudbuild.iam.gserviceaccount.com`) 在目標專案中擁有 `roles/run.admin` 與 `roles/iam.serviceAccountUser` 權限。

## 5. 權限清單 (IAM Roles)

`cicd-runner` 服務帳戶在 Staging/Prod 專案中至少需要以下權限：
- `roles/run.admin`
- `roles/storage.admin`
- `roles/cloudsql.admin`
- `roles/compute.networkAdmin`
- `roles/iam.serviceAccountUser` (在 `app_sa` 上)
- `roles/secretmanager.admin`
- `roles/bigquery.admin`
