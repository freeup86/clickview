# ============================================================
# ClickView Enterprise - Terraform Makefile
# ============================================================

.PHONY: help init plan apply destroy fmt validate docs

# Default environment
ENV ?= staging

# Terraform directory
TF_DIR := .
TF_VARS := -var-file=environments/$(ENV).tfvars

# Colors
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m

help: ## Show this help
	@echo "ClickView Terraform Commands"
	@echo ""
	@echo "Usage: make <target> ENV=<environment>"
	@echo ""
	@echo "Environments: staging, production"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "$(GREEN)%-20s$(NC) %s\n", $$1, $$2}'

# ============================================================
# INITIALIZATION
# ============================================================

init: ## Initialize Terraform
	@echo "$(GREEN)Initializing Terraform for $(ENV)...$(NC)"
	terraform -chdir=$(TF_DIR) init -upgrade

init-backend: ## Initialize Terraform backend (first-time setup)
	@echo "$(GREEN)Initializing Terraform backend...$(NC)"
	cd bootstrap && terraform init
	cd bootstrap && terraform apply -auto-approve

# ============================================================
# PLANNING
# ============================================================

plan: ## Plan Terraform changes
	@echo "$(GREEN)Planning Terraform changes for $(ENV)...$(NC)"
	terraform -chdir=$(TF_DIR) plan $(TF_VARS)

plan-out: ## Plan and save to file
	@echo "$(GREEN)Planning Terraform changes for $(ENV)...$(NC)"
	terraform -chdir=$(TF_DIR) plan $(TF_VARS) -out=tfplan

plan-destroy: ## Plan destruction
	@echo "$(RED)Planning destruction for $(ENV)...$(NC)"
	terraform -chdir=$(TF_DIR) plan $(TF_VARS) -destroy

# ============================================================
# APPLYING
# ============================================================

apply: ## Apply Terraform changes
	@echo "$(GREEN)Applying Terraform changes for $(ENV)...$(NC)"
	terraform -chdir=$(TF_DIR) apply $(TF_VARS)

apply-auto: ## Apply Terraform changes (auto-approve)
	@echo "$(YELLOW)Auto-approving Terraform changes for $(ENV)...$(NC)"
	terraform -chdir=$(TF_DIR) apply $(TF_VARS) -auto-approve

apply-plan: ## Apply saved plan
	@echo "$(GREEN)Applying saved plan for $(ENV)...$(NC)"
	terraform -chdir=$(TF_DIR) apply tfplan

# ============================================================
# DESTROYING
# ============================================================

destroy: ## Destroy infrastructure (requires confirmation)
	@echo "$(RED)Destroying infrastructure for $(ENV)...$(NC)"
	@echo "$(RED)WARNING: This will destroy all resources!$(NC)"
	@read -p "Type 'destroy-$(ENV)' to confirm: " confirm && [ "$$confirm" = "destroy-$(ENV)" ]
	terraform -chdir=$(TF_DIR) destroy $(TF_VARS)

# ============================================================
# VALIDATION
# ============================================================

fmt: ## Format Terraform files
	@echo "$(GREEN)Formatting Terraform files...$(NC)"
	terraform -chdir=$(TF_DIR) fmt -recursive

fmt-check: ## Check Terraform formatting
	@echo "$(GREEN)Checking Terraform formatting...$(NC)"
	terraform -chdir=$(TF_DIR) fmt -check -recursive

validate: ## Validate Terraform configuration
	@echo "$(GREEN)Validating Terraform configuration...$(NC)"
	terraform -chdir=$(TF_DIR) validate

lint: fmt-check validate ## Run all linting checks
	@echo "$(GREEN)All checks passed!$(NC)"

# ============================================================
# STATE MANAGEMENT
# ============================================================

state-list: ## List resources in state
	@echo "$(GREEN)Listing state resources for $(ENV)...$(NC)"
	terraform -chdir=$(TF_DIR) state list

state-show: ## Show specific resource (use RESOURCE=xxx)
	@echo "$(GREEN)Showing resource $(RESOURCE)...$(NC)"
	terraform -chdir=$(TF_DIR) state show $(RESOURCE)

state-pull: ## Pull current state
	@echo "$(GREEN)Pulling state for $(ENV)...$(NC)"
	terraform -chdir=$(TF_DIR) state pull > state-$(ENV).json

# ============================================================
# OUTPUTS
# ============================================================

output: ## Show all outputs
	@echo "$(GREEN)Showing outputs for $(ENV)...$(NC)"
	terraform -chdir=$(TF_DIR) output

output-json: ## Show outputs as JSON
	terraform -chdir=$(TF_DIR) output -json

# ============================================================
# DOCUMENTATION
# ============================================================

docs: ## Generate documentation
	@echo "$(GREEN)Generating documentation...$(NC)"
	terraform-docs markdown table . > INFRASTRUCTURE.md

graph: ## Generate dependency graph
	@echo "$(GREEN)Generating dependency graph...$(NC)"
	terraform -chdir=$(TF_DIR) graph | dot -Tpng > infrastructure-graph.png

# ============================================================
# UTILITIES
# ============================================================

clean: ## Clean Terraform files
	@echo "$(YELLOW)Cleaning Terraform files...$(NC)"
	rm -rf $(TF_DIR)/.terraform
	rm -f $(TF_DIR)/tfplan
	rm -f $(TF_DIR)/*.tfstate*

console: ## Open Terraform console
	@echo "$(GREEN)Opening Terraform console for $(ENV)...$(NC)"
	terraform -chdir=$(TF_DIR) console $(TF_VARS)

# ============================================================
# WORKSPACE MANAGEMENT
# ============================================================

workspace-list: ## List workspaces
	terraform -chdir=$(TF_DIR) workspace list

workspace-new: ## Create new workspace (use NAME=xxx)
	terraform -chdir=$(TF_DIR) workspace new $(NAME)

workspace-select: ## Select workspace (use NAME=xxx)
	terraform -chdir=$(TF_DIR) workspace select $(NAME)

# ============================================================
# CI/CD HELPERS
# ============================================================

ci-init: ## CI initialization
	terraform -chdir=$(TF_DIR) init -input=false

ci-plan: ## CI plan (outputs plan file)
	terraform -chdir=$(TF_DIR) plan $(TF_VARS) -input=false -out=tfplan

ci-apply: ## CI apply (uses plan file)
	terraform -chdir=$(TF_DIR) apply -input=false tfplan

# ============================================================
# SECURITY
# ============================================================

security-scan: ## Run security scan with tfsec
	@echo "$(GREEN)Running security scan...$(NC)"
	tfsec $(TF_DIR)

cost-estimate: ## Estimate costs with Infracost
	@echo "$(GREEN)Estimating costs for $(ENV)...$(NC)"
	infracost breakdown --path $(TF_DIR) --terraform-var-file environments/$(ENV).tfvars
