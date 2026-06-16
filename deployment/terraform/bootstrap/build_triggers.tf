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

# -------------------------------------------------------------------------
# Cloud Build Trigger for Staging
# -------------------------------------------------------------------------
resource "google_cloudbuild_trigger" "staging_deploy" {
  name        = "${var.project_name}-staging-deploy"
  project     = var.project_id
  location    = var.region
  description = "Trigger for staging deployment on push to main branch"

  repository_event_config {
    repository = google_cloudbuildv2_repository.main_repo.id
    push {
      branch = "^${var.branch_name}$"
    }
  }

  filename = ".cloudbuild/staging.yaml"

  substitutions = {
    _STAGING_PROJECT_ID = var.project_id
    _REGION             = var.region
    _REPO               = "insurance-agent-repo" # Adjust as needed or use a variable
  }

  service_account = "projects/${var.project_id}/serviceAccounts/${data.google_project.project.number}-compute@developer.gserviceaccount.com"

  include_build_logs = "INCLUDE_BUILD_LOGS_WITH_STATUS"

  depends_on = [
    google_cloudbuildv2_repository.main_repo
  ]
}

# -------------------------------------------------------------------------
# Cloud Build Trigger for PR Checks
# -------------------------------------------------------------------------
resource "google_cloudbuild_trigger" "pr_checks" {
  name        = "${var.project_name}-pr-checks"
  project     = var.project_id
  location    = var.region
  description = "Trigger for PR checks"

  repository_event_config {
    repository = google_cloudbuildv2_repository.main_repo.id
    pull_request {
      branch          = "^${var.branch_name}$"
      comment_control = "COMMENTS_ENABLED_FOR_EXTERNAL_CONTRIBUTORS_ONLY"
    }
  }

  filename = ".cloudbuild/pr_checks.yaml"

  substitutions = {
    _REGION = var.region
  }

  service_account = "projects/${var.project_id}/serviceAccounts/${data.google_project.project.number}-compute@developer.gserviceaccount.com"

  include_build_logs = "INCLUDE_BUILD_LOGS_WITH_STATUS"

  depends_on = [
    google_cloudbuildv2_repository.main_repo
  ]
}
