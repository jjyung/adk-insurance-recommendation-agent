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

variable "project_id" {
  type        = string
  description = "The Google Cloud Project ID where resources will be deployed."
}

variable "project_name" {
  type        = string
  description = "Project name used as a base for resource naming"
  default     = "insurance-agent"
}

variable "region" {
  type        = string
  description = "Google Cloud region for resource deployment."
  default     = "us-central1"
}

variable "github_owner" {
  type        = string
  description = "The owner of the GitHub repository."
}

variable "github_repo_name" {
  type        = string
  description = "The name of the GitHub repository."
}

variable "branch_name" {
  type        = string
  description = "The branch to trigger builds from."
  default     = "main"
}
