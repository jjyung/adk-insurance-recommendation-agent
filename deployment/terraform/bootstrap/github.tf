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
# Cloud Build V2 Repository Connection (GitHub)
# -------------------------------------------------------------------------
# Note: The connection usually needs to be authorized manually in the GCP Console
# if it's the first time connecting to GitHub.
resource "google_cloudbuildv2_connection" "github_conn" {
  project  = var.project_id
  location = var.region
  name     = "${var.project_name}-github-conn"

  github_config {
    # This block is required by Terraform but populated via manual OAuth
  }

  depends_on = [google_project_service.services]

  lifecycle {
    ignore_changes = [github_config]
  }
}

resource "google_cloudbuildv2_repository" "main_repo" {
  project           = var.project_id
  location          = var.region
  name              = var.github_repo_name
  parent_connection = google_cloudbuildv2_connection.github_conn.name
  remote_uri        = "https://github.com/${var.github_owner}/${var.github_repo_name}.git"

  depends_on = [google_cloudbuildv2_connection.github_conn]
}
