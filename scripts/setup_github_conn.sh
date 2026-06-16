#!/bin/bash
set -e

# Load environment variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

PROJECT_ID=${GCP_PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}
REGION=${GCP_REGION:-us-central1}
CONN_NAME="insurance-agent-github-conn"
TF_DIR="deployment/terraform/bootstrap"

echo "===================================================================="
echo "🚀 正在檢查 GitHub 連線狀態..."
echo "===================================================================="

# Check if connection already exists
CONN_EXISTS=$(gcloud builds connections list --region="$REGION" --project="$PROJECT_ID" --filter="name:$CONN_NAME" --format="value(name)")

if [ -z "$CONN_EXISTS" ]; then
    echo "📦 正在建立 GitHub 連線: $CONN_NAME..."
    gcloud builds connections create github "$CONN_NAME" --region="$REGION" --project="$PROJECT_ID"
else
    echo "✅ GitHub 連線 $CONN_NAME 已存在。"
fi

# Get current state
STATE=$(gcloud builds connections describe "$CONN_NAME" --region="$REGION" --project="$PROJECT_ID" --format="value(installationState.stage)")

if [ "$STATE" == "COMPLETE" ]; then
    echo "✅ GitHub 連線已授權完成。"
else
    AUTH_URL=$(gcloud builds connections describe "$CONN_NAME" --region="$REGION" --project="$PROJECT_ID" --format="value(installationState.actionUri)")
    echo "⚠️  需要手動授權！"
    echo "🔗 請點擊以下連結進行 GitHub 授權："
    echo ""
    echo -e "\033[1;34m$AUTH_URL\033[0m"
    echo ""
    echo "⏳ 正在等待授權完成 (Polling)..."

    while true; do
        STATE=$(gcloud builds connections describe "$CONN_NAME" --region="$REGION" --project="$PROJECT_ID" --format="value(installationState.stage)")
        if [ "$STATE" == "COMPLETE" ]; then
            echo ""
            echo "✨ 偵測到授權已完成！"
            break
        fi
        printf "."
        sleep 5
    done
fi

# Import to Terraform if not already in state
echo "🔄 正在同步 Terraform 狀態..."
cd "$TF_DIR"
if ! terraform state show google_cloudbuildv2_connection.github_conn >/dev/null 2>&1; then
    echo "📥 正在將連線導入 Terraform..."
    terraform import -var="project_id=$PROJECT_ID" -var="region=$REGION" -var="github_owner=$GITHUB_OWNER" -var="github_repo_name=$GITHUB_REPO_NAME" \
        google_cloudbuildv2_connection.github_conn "projects/$PROJECT_ID/locations/$REGION/connections/$CONN_NAME"
else
    echo "✅ Terraform 已在追蹤此連線。"
fi

echo "===================================================================="
echo "🎉 GitHub 連線已就緒！"
echo "===================================================================="
