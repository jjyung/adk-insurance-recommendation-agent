# CI/CD Bootstrap Infrastructure

This directory contains the Terraform configuration for provisioning the foundational CI/CD resources, which should be deployed **once per project** (typically in the dev or a dedicated CI/CD project, or per environment if complete isolation is required).

## Resources Managed
- **GitHub Connection**: Cloud Build v2 connection to your GitHub repository.
- **Cloud Build Triggers**: Triggers for PR checks and Staging deployments.
- **IAM Permissions**: Specific permissions needed for Cloud Build to execute deployments.

## Deployment Instructions

1.  **Initialize Terraform**:
    terraform init

2.  **Plan the deployment**:
    You will need to provide your GitHub owner and repository name.
    terraform plan -var="project_id=YOUR_PROJECT_ID" -var="github_owner=YOUR_GITHUB_USER" -var="github_repo_name=YOUR_REPO_NAME"

3.  **Apply the deployment**:
    terraform apply -var="project_id=YOUR_PROJECT_ID" -var="github_owner=YOUR_GITHUB_USER" -var="github_repo_name=YOUR_REPO_NAME"

**Note**: After deploying the GitHub Connection, you may need to visit the Google Cloud Console to manually authorize the connection if this is the first time connecting this project to GitHub.
